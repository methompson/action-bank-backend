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

  async getExchangeById(userId: string): Promise<Exchange> {
    const ex = this._exchanges[userId];

    if (ex === undefined) {
      throw new DataDoesNotExistException('Exchange Does Not Exist');
    }

    return ex;
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

  async editExchange(exchangeId: string, name: string): Promise<Exchange> {
    const oldEx = this._exchanges[exchangeId];

    if (oldEx === undefined) {
      throw new Error('Exchange does not exist');
    }

    const ex = new Exchange(
      oldEx.id,
      oldEx.userId,
      name,
      oldEx.depositActions,
      oldEx.withdrawalActions,
      oldEx.deposits,
      oldEx.withdrawals,
    );

    this._exchanges[exchangeId] = ex;

    this.writeBankData();

    return ex;
  }

  async deleteExchange(exchangeId: string): Promise<string> {
    const ex = this._exchanges[exchangeId];

    if (ex === undefined) {
      throw new Error('Exchange does not exist');
    }

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

    delete this._depositActions[depositActionId];

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

    delete this._withdrawalActions[withdrawalActionId];

    this.writeBankData();

    return withdrawalActionId;
  }

  async getDepositById(id: string): Promise<Deposit> {
    throw new Error('Unimplemented');
  }
  async getDepositsByUserId(userId: string): Promise<Deposit[]> {
    throw new Error('Unimplemented');
  }
  async getDepositsByDepositActionId(actionId: string): Promise<Deposit[]> {
    throw new Error('Unimplemented');
  }
  async addDeposit(deposit: NewDeposit): Promise<Deposit> {
    throw new Error('Unimplemented');
  }
  async editDeposit(deposit: Deposit): Promise<Deposit> {
    throw new Error('Unimplemented');
  }
  async deleteDeposit(userId: string): Promise<string> {
    throw new Error('Unimplemented');
  }

  async getWithdrawalById(id: string): Promise<Withdrawal> {
    throw new Error('Unimplemented');
  }
  async getWithdrawalsByUserIdv(userId: string): Promise<Withdrawal[]> {
    throw new Error('Unimplemented');
  }
  async getWithdrawalsByWithdrawalActionId(actionId: string): Promise<Withdrawal[]> {
    throw new Error('Unimplemented');
  }
  async addWithdrawal(withdrawal: NewWithdrawal): Promise<Withdrawal> {
    throw new Error('Unimplemented');
  }
  async editWithdrawal(withdrawal: Withdrawal): Promise<Withdrawal> {
    throw new Error('Unimplemented');
  }
  async deleteWithdrawal(userId: string): Promise<string> {
    throw new Error('Unimplemented');
  }
}

class BankData {
  constructor(
    public exchanges: Record<string, Exchange>,
    public depositActions: Record<string, DepositAction>,
    public withdrawalActions: Record<string, WithdrawalAction>,
  ) {}

  toJSON() {
    return {
      exchanges: Object.values(this.exchanges),
      depositActions: Object.values(this.depositActions),
      withdrawalActions: Object.values(this.withdrawalActions),
    };
  }

  static fromJson(rawJson: unknown): BankData {
    if (!isRecord(rawJson)
      || !Array.isArray(rawJson.exchanges)
      || !Array.isArray(rawJson.depositActions)
      || !Array.isArray(rawJson.withdrawalActions)
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

    return new BankData(
      exchangesMap,
      depositActionMap,
      withdrawalActionMap,
    );
  }
}

export default BasicBankController;