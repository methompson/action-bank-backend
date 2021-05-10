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
} from '@dataTypes';
import { isRecord } from '@dataTypes/type-guards';
import { InvalidJSONException } from '@root/exceptions/data-controller-exceptions';

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
  }

  protected idExists(id: string): boolean {
    const exists = id in this._exchanges;
    return exists;
  }

  async addExchange(userId: string, exchange: NewExchange): Promise<Exchange> {
    let id: string;
    // We'll get a unique ID
    do {
      id = uuidv4();
    } while(this.idExists(id));

    const ex = Exchange.fromNewExchange(id, userId, exchange);

    this._exchanges[ex.id] = ex;

    this.writeBankData();

    return ex;
  }

  async getExchangeById(id: string): Promise<Exchange> {
    throw new Error('Unimplemented');
  }

  async getExchangesByUserId(id: string): Promise<Exchange[]> {
    throw new Error('Unimplemented');
  }

  async editExchange(exhcnage: Exchange): Promise<Exchange> {
    throw new Error('Unimplemented');
  }

  async deleteExchange(id: string): Promise<string> {
    throw new Error('Unimplemented');
  }

  async getDepositActionById(id: string): Promise<DepositAction> {
    throw new Error('Unimplemented');
  }
  async getDepositActionsByUserId(userId: string): Promise<DepositAction[]> {
    throw new Error('Unimplemented');
  }
  async addDepositAction(userId: string, action: NewDepositAction): Promise<DepositAction> {
    throw new Error('Unimplemented');
  }
  async editDepositAction(action: DepositAction): Promise<DepositAction> {
    throw new Error('Unimplemented');
  }
  async deleteDepositAction(id: string): Promise<null> {
    throw new Error('Unimplemented');
  }

  async getWithdrawalActionById(id: string): Promise<WithdrawalAction> {
    throw new Error('Unimplemented');
  }
  async getWithdrawalActionsByUserId(userId: string): Promise<WithdrawalAction[]> {
    throw new Error('Unimplemented');
  }
  async addWithdrawalAction(userId: string, action: NewWithdrawalAction): Promise<WithdrawalAction> {
    throw new Error('Unimplemented');
  }
  async editWithdrawalAction(action: WithdrawalAction): Promise<WithdrawalAction> {
    throw new Error('Unimplemented');
  }
  async deleteWithdrawalAction(userId: string): Promise<string> {
    throw new Error('Unimplemented');
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
  async addDeposit(userId: string, deposit: NewDeposit): Promise<Deposit> {
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
  async addWithdrawal(userId: string, withdrawal: Withdrawal): Promise<Withdrawal> {
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
    public exchanges: Record<string, Exchange>
  ) {}

  toJSON() {
    return {
      exchanges: this.exchanges,
    };
  }

  static fromJson(rawJson: unknown): BankData {
    if (!isRecord(rawJson)
      || !isRecord(rawJson.exchanges)
    ) {
      throw new InvalidJSONException('Invalid Data');
    }

    const exchangesMap: Record<string, Exchange> = {};

    Object.values(rawJson.exchanges).forEach((val) => {
      try {
        const ex = Exchange.fromJson(val);
        exchangesMap[ex.id] = ex;
      } catch(_) {}
    });

    return new BankData(
      exchangesMap,
    );
  }
}

export default BasicBankController;