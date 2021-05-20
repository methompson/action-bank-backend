import { open, writeFile, mkdir } from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { BankController } from '@root/data-controllers/interfaces';
import BasicDataControllerBase from './basic-controller-base';
import {
  NewDepositAction,
  DepositAction,
  ProgramContext,
  Deposit,
  Exchange,
  NewDeposit,
  NewExchange,
  NewWithdrawalAction,
  Withdrawal,
  WithdrawalAction,
  UserToken,
  NewWithdrawal,
} from '@dataTypes';
import { isRecord } from '@dataTypes/type-guards';
import { DataDoesNotExistException, InvalidJSONException } from '@root/exceptions/data-controller-exceptions';

// The bank controller will store all of the data points below into a single
// JSON file for all of the respective data points.
// We'll store the following in their own keys:
// * Exchanges
// * Withdrawal Actions
// * Deposit Actions
// * Deposits
// * Withdrawals
// Each will be an array holding all the values.

class BasicBankController extends BasicDataControllerBase implements BankController {
  protected _bankFileName = 'bank.json';
  protected _bankWriteLock = false;
  protected _bankWriteAgain = false;

  protected _exchanges: Record<string, Exchange> = {};
  protected _depositActions: Record<string, DepositAction> = {};
  protected _withdrawalActions: Record<string, WithdrawalAction> = {};
  protected _deposits: Record<string, Deposit> = {};
  protected _withdrawals: Record<string, Withdrawal> = {};

  constructor(dataLocation: string, programContext: ProgramContext) {
    super(programContext);
    this.dataLocation = dataLocation;
  }

  async writeBankData(): Promise<void> {
    if (this._bankWriteLock === true) {
      console.log("bank data writelock hit");
      this._bankWriteAgain = true;
      return;
    }

    this._bankWriteLock = true;

    const bankData = new BankData(
      this._exchanges,
      this._depositActions,
      this._withdrawalActions,
      this._deposits,
      this._withdrawals,
    );

    const loc = path.join(this.dataLocation, this._bankFileName);
    const handle = await open(loc, 'w+');
    await writeFile(handle, JSON.stringify(bankData));

    await handle.close();
    this._bankWriteLock = false;

    if (this._bankWriteAgain === true) {
      console.log("write bank data again");
      this._bankWriteAgain = false;
      void this.writeBankData();
    }
  }

  /**
   * This method will read the data from the user file using the user data handle.
   * It will parse the contents of the file and insert the value into the _users variable.
   */
  async readBankData(): Promise<void> {
    await mkdir(this.dataLocation, { recursive: true });

    // We have to use a+ to create the file if it doesn't exist.
    // r will throw an exception if the file doesn't exist.
    // w+ will truncate the file if it already exists.
    const loc = path.join(this.dataLocation, this._bankFileName);
    const handle = await open(loc, 'a+');
    const bankDataString = await handle.readFile('utf-8');

    void handle.close();

    const rawBankData: unknown = JSON.parse(bankDataString);

    if (!isRecord(rawBankData) || rawBankData === null) {
      throw new Error('Invalid JSON format');
    }

    const bankData = BankData.fromJson(rawBankData);

    this._exchanges = bankData.exchanges;
    this._depositActions = bankData.depositActions;
    this._withdrawalActions = bankData.withdrawalActions;
    this._deposits = bankData.deposits;
    this._withdrawals = bankData.withdrawals;
  }

  async addExchange(exchange: NewExchange): Promise<Exchange> {
    let id: string;
    // We'll get a unique ID
    do {
      id = uuidv4();
    } while(this.idExists(id, this._exchanges));

    const ex = Exchange.fromNewExchange(id, exchange);

    this._exchanges[ex.id] = ex;

    this.writeBankData();

    return ex;
  }

  async getExchangeById(exchangeId: string): Promise<Exchange> {
    const ex = this._exchanges[exchangeId];

    if (ex === undefined) {
      throw new DataDoesNotExistException('Exchange Does Not Exist');
    }

    const dActions = this.getDepositActionsByExchangeId(ex.id);
    const wActions = this.getWithdrawalActionsByExchangeId(ex.id);
    const d = this.getDepositsByExchangeId(ex.id);
    const w = this.getWithdrawalsByExchangeId(ex.id);

    ex.setActionsAndExchanges(
      dActions,
      wActions,
      d,
      w,
    );

    return ex;
  }

  private getDepositActionsByExchangeId(exchangeId: string): DepositAction[] {
    const actions: DepositAction[] = [];
    Object.values(this._depositActions).forEach((ac) => {
      if (ac.exchangeId === exchangeId) actions.push(ac);
    });

    return actions;
  }

  private getWithdrawalActionsByExchangeId(exchangeId: string): WithdrawalAction[] {
    const actions: WithdrawalAction[] = [];
    Object.values(this._withdrawalActions).forEach((ac) => {
      if (ac.exchangeId === exchangeId) actions.push(ac);
    });

    return actions;
  }

  private getDepositsByExchangeId(exchangeId: string): Deposit[] {
    const deposits: Deposit[] = [];
    Object.values(this._deposits).forEach((dep) => {
      if (dep.exchangeId === exchangeId) deposits.push(dep);
    });

    return deposits;
  }

  private getWithdrawalsByExchangeId(exchangeId: string): Withdrawal[] {
    const withdrawals: Withdrawal[] = [];
    Object.values(this._withdrawals).forEach((w) => {
      if (w.exchangeId === exchangeId) withdrawals.push(w);
    });

    return withdrawals;
  }

  async getExchangesByUserId(userId: string): Promise<Exchange[]> {
    const exchanges: Exchange[] = [];
    Object.values(this._exchanges).forEach((ex) => {
      if (ex.userId === userId) {
        exchanges.push(ex);
      }
    });

    return exchanges;
  }

  async editExchange(newExchange: Exchange): Promise<Exchange> {
    const oldEx = this._exchanges[newExchange.id];

    if (oldEx === undefined) {
      throw new Error('Exchange does not exist');
    }

    const ex = new Exchange(
      oldEx.id,
      oldEx.userId,
      newExchange.name,
      oldEx.depositActions,
      oldEx.withdrawalActions,
      oldEx.deposits,
      oldEx.withdrawals,
    );

    this._exchanges[newExchange.id] = ex;

    this.writeBankData();

    return ex;
  }

  async deleteExchange(exchangeId: string): Promise<string> {
    const ex = this._exchanges[exchangeId];

    if (ex === undefined) {
      throw new Error('Exchange does not exist');
    }

    const depositActionsToDelete: DepositAction[] = [];
    Object.values(this._depositActions).forEach((value) => {
      if (value.exchangeId === exchangeId) {
        depositActionsToDelete.push(value);
      }
    });
    this.deleteDepositActions(depositActionsToDelete);

    const withdrawalActionsToDelete: WithdrawalAction[] = [];
    Object.values(this._withdrawalActions).forEach((value) => {
      if (value.exchangeId === exchangeId) {
        withdrawalActionsToDelete.push(value);
      }
    });
    this.deleteWithdrawalActions(withdrawalActionsToDelete);

    delete this._exchanges[exchangeId];

    this.writeBankData();

    return exchangeId;
  }

  async getDepositActionById(depositActionId: string): Promise<DepositAction> {
    const ac = this._depositActions[depositActionId];

    if (ac === undefined) {
      throw new DataDoesNotExistException('Deposit Action Does Not Exist');
    }

    return ac;
  }

  async getDepositActionsByUserId(userId: string): Promise<DepositAction[]> {
    const actions: DepositAction[] = [];

    Object.values(this._depositActions).forEach((ac) => {
      if (ac.userId === userId) {
        actions.push(ac);
      }
    });

    return actions;
  }

  async addDepositAction(action: NewDepositAction): Promise<DepositAction> {
    let id: string;
    // We'll get a unique ID
    do {
      id = uuidv4();
    } while(this.idExists(id, this._depositActions));

    const ac = DepositAction.fromNewDepositAction(action, id);

    this._depositActions[id] = ac;

    this.writeBankData();

    return ac;
  }

  async editDepositAction(action: DepositAction): Promise<DepositAction> {
    const oldAction = this._depositActions[action.id];

    if (oldAction === undefined) {
      throw new Error('Deposit Action Does Not Exist');
    }

    this._depositActions[action.id] = action;

    this.writeBankData();

    return action;
  }

  async deleteDepositAction(depositActionId: string): Promise<string> {
    const ac = this._depositActions[depositActionId];

    if (ac === undefined) {
      throw new DataDoesNotExistException('Deposit Action Does Not Exist');
    }

    // Delete all deposits associated with the action
    this.deleteDepositActions([ac]);

    this.writeBankData();

    return depositActionId;
  }

  async getWithdrawalActionById(withdrawalActionid: string): Promise<WithdrawalAction> {
    const ac = this._withdrawalActions[withdrawalActionid];

    if (ac === undefined) {
      throw new DataDoesNotExistException('Withdrawal Action Does Not Exist');
    }

    return ac;
  }

  async getWithdrawalActionsByUserId(userId: string): Promise<WithdrawalAction[]> {
    const actions: WithdrawalAction[] = [];

    Object.values(this._withdrawalActions).forEach((ac) => {
      if (ac.userId === userId) {
        actions.push(ac);
      }
    });

    return actions;
  }

  async addWithdrawalAction(action: NewWithdrawalAction): Promise<WithdrawalAction> {
    let id: string;
    // We'll get a unique ID
    do {
      id = uuidv4();
    } while(this.idExists(id, this._depositActions));

    const ac = WithdrawalAction.fromNewWithdrawalAction(action, id);

    this._withdrawalActions[id] = ac;

    this.writeBankData();

    return ac;
  }

  async editWithdrawalAction(action: WithdrawalAction): Promise<WithdrawalAction> {
    const oldAction = this._withdrawalActions[action.id];

    if (oldAction === undefined) {
      throw new Error('Withdrawal Action Does Not Exist');
    }

    this._withdrawalActions[action.id] = action;

    this.writeBankData();

    return action;
  }

  async deleteWithdrawalAction(withdrawalActionId: string): Promise<string> {
    const ac = this._withdrawalActions[withdrawalActionId];

    if (ac === undefined) {
      throw new DataDoesNotExistException('Withdrawal Action Does Not Exist');
    }

    // Delete all withdrawals associated with the action
    this.deleteWithdrawalActions([ac]);

    this.writeBankData();

    return withdrawalActionId;
  }

  async getDepositById(depositId: string): Promise<Deposit> {
    const dep = this._deposits[depositId];

    if (dep === undefined) {
      throw new DataDoesNotExistException('Deposit Does Not Exist');
    }

    return dep;
  }

  async getDepositsByUserId(userId: string): Promise<Deposit[]> {
    const deposits: Deposit[] = [];

    Object.values(this._deposits).forEach((dep) => {
      if (dep.userId === userId) {
        deposits.push(dep);
      }
    });

    return deposits;
  }

  async getDepositsByDepositActionId(depositActionId: string): Promise<Deposit[]> {
    const deposits: Deposit[] = [];

    Object.values(this._deposits).forEach((dep) => {
      if (dep.depositActionId === depositActionId) {
        deposits.push(dep);
      }
    });

    return deposits;
  }

  async addDeposit(deposit: NewDeposit): Promise<Deposit> {
    let id: string;
    // We'll get a unique ID
    do {
      id = uuidv4();
    } while(this.idExists(id, this._deposits));

    const dep = Deposit.fromNewDeposit(deposit, id);

    this._deposits[id] = dep;

    this.writeBankData();

    return dep;
  }

  async editDeposit(deposit: Deposit): Promise<Deposit> {
    const oldDeposit = this._deposits[deposit.id];

    if (oldDeposit === undefined) {
      throw new Error('Deposit Does Not Exist');
    }

    this._deposits[deposit.id] = deposit;

    this.writeBankData();

    return deposit;
  }

  async deleteDeposit(depositId: string): Promise<string> {
    const ac = this._deposits[depositId];

    if (ac === undefined) {
      throw new DataDoesNotExistException('Deposit Does Not Exist');
    }

    delete this._deposits[depositId];

    this.writeBankData();

    return depositId;
  }

  async getWithdrawalById(withdrawalId: string): Promise<Withdrawal> {
    const wd = this._withdrawals[withdrawalId];

    if (wd === undefined) {
      throw new DataDoesNotExistException('Withdrawal Does Not Exist');
    }

    return wd;
  }

  async getWithdrawalsByUserId(userId: string): Promise<Withdrawal[]> {
    const withdrawals: Withdrawal[] = [];

    Object.values(this._withdrawals).forEach((wd) => {
      if (wd.userId === userId) {
        withdrawals.push(wd);
      }
    });

    return withdrawals;
  }

  async getWithdrawalsByWithdrawalActionId(withdrawalActionId: string): Promise<Withdrawal[]> {
    const withdrawals: Withdrawal[] = [];

    Object.values(this._withdrawals).forEach((wd) => {
      if (wd.withdrawalActionId === withdrawalActionId) {
        withdrawals.push(wd);
      }
    });

    return withdrawals;
  }

  async addWithdrawal(withdrawal: NewWithdrawal): Promise<Withdrawal> {
    let id: string;
    // We'll get a unique ID
    do {
      id = uuidv4();
    } while(this.idExists(id, this._deposits));

    const wd = Withdrawal.fromNewWithdrawal(withdrawal, id);

    this._withdrawals[id] = wd;

    this.writeBankData();

    return wd;
  }

  async editWithdrawal(withdrawal: Withdrawal): Promise<Withdrawal> {
    const oldWithdrawal = this._withdrawals[withdrawal.id];

    if (oldWithdrawal === undefined) {
      throw new Error('Withdrawal Does Not Exist');
    }

    this._withdrawals[withdrawal.id] = withdrawal;

    this.writeBankData();

    return withdrawal;
  }

  async deleteWithdrawal(withdrawalId: string): Promise<string> {
    const oldWithdrawal = this._withdrawals[withdrawalId];

    if (oldWithdrawal === undefined) {
      throw new DataDoesNotExistException('Withdrawal Does Not Exist');
    }

    delete this._withdrawals[withdrawalId];

    this.writeBankData();

    return withdrawalId;
  }

  protected deleteDepositActions(actions: DepositAction[]) {
    const depositsToDelete: string[] = [];

    const actionIds = actions.map((ac) => {
      return ac.id;
    });

    // Delete all deposits associated with the action
    Object.entries(this._deposits).forEach(([key, val]) => {
      if (actionIds.includes(val.depositActionId)) {
        depositsToDelete.push(key);
      }
    });

    depositsToDelete.forEach((id) => {
      delete this._deposits[id];
    });

    actions.forEach((action) => {
      delete this._depositActions[action.id];
    });
  }

  protected deleteWithdrawalActions(actions: WithdrawalAction[]) {
    const withdrawalsToDelete: string[] = [];

    const actionIds = actions.map((ac) => {
      return ac.id;
    });

    // Delete all withdrawals associated with the action
    Object.entries(this._withdrawals).forEach(([key, val]) => {
      if (actionIds.includes(val.withdrawalActionId)) {
        withdrawalsToDelete.push(key);
      }
    });

    withdrawalsToDelete.forEach((id) => {
      delete this._withdrawals[id];
    });

    actions.forEach((action) => {
      delete this._withdrawalActions[action.id];
    });
  }
}

class BankData {
  constructor(
    public exchanges: Record<string, Exchange>,
    public depositActions: Record<string, DepositAction>,
    public withdrawalActions: Record<string, WithdrawalAction>,
    public deposits: Record<string, Deposit>,
    public withdrawals: Record<string, Withdrawal>,
  ) {}

  toJSON() {
    return {
      exchanges: Object.values(this.exchanges),
      depositActions: Object.values(this.depositActions),
      withdrawalActions: Object.values(this.withdrawalActions),
      deposits: Object.values(this.deposits),
      withdrawals: Object.values(this.withdrawals),
    };
  }

  static fromJson(rawJson: unknown): BankData {
    if (!isRecord(rawJson)
      || !Array.isArray(rawJson.exchanges)
      || !Array.isArray(rawJson.depositActions)
      || !Array.isArray(rawJson.withdrawalActions)
      || !Array.isArray(rawJson.deposits)
      || !Array.isArray(rawJson.withdrawals)
    ) {
      throw new InvalidJSONException('Invalid Data');
    }

    const exchangesMap: Record<string, Exchange> = {};

    rawJson.exchanges.forEach((val) => {
      try {
        const ex = Exchange.fromJSON(val);
        exchangesMap[ex.id] = ex;
      } catch(_) {}
    });

    const depositActionMap: Record<string, DepositAction> = {};

    rawJson.depositActions.forEach((val) => {
      try {
        const ac = DepositAction.fromJSON(val);
        depositActionMap[ac.id] = ac;
      } catch(_) {}
    });

    const withdrawalActionMap: Record<string, WithdrawalAction> = {};

    rawJson.withdrawalActions.forEach((val) => {
      try {
        const ac = WithdrawalAction.fromJSON(val);
        withdrawalActionMap[ac.id] = ac;
      } catch(_) {}
    });

    const depositMap: Record<string, Deposit> = {};

    rawJson.deposits.forEach((val) => {
      try {
        const d = Deposit.fromJSON(val);
        depositMap[d.id] = d;
      } catch(_) {
        console.log();
      }
    });

    const withdrawalMap: Record<string, Withdrawal> = {};
    rawJson.withdrawals.forEach((val) => {
      try {
        const w = Withdrawal.fromJSON(val);
        withdrawalMap[w.id] = w;
      } catch(_) {}
    });

    return new BankData(
      exchangesMap,
      depositActionMap,
      withdrawalActionMap,
      depositMap,
      withdrawalMap,
    );
  }
}

export default BasicBankController;