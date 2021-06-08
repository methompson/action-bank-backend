import {
  DepositAction,
  WithdrawalAction,
  Deposit,
  Withdrawal,
} from "@dataTypes";
import { InvalidJSONException } from "@root/exceptions/data-controller-exceptions";
import { isRecord, isString } from "./type-guards";



/**
 * The Exchange keeps track of all the withdrawal actions and deposit actions that can
 * be used with each other. The exhcange will keep track of the amount of currency
 * available to be spent on withdrawals and should be able to calculate the currency
 * from the deposit actions.
 */
class NewExchange {
  protected _depositActions: DepositAction[] = [];
  protected _withdrawalActions: WithdrawalAction[] = [];

  protected _deposits: Deposit[] = [];
  protected _withdrawals: Withdrawal[] = [];

  protected _totalCurrency = 0;

  get userId(): string { return this._userId; }
  get name(): string { return this._name; }
  get description(): string { return this._description; }

  get totalCurrency(): number { return this._totalCurrency; }

  get depositActions(): DepositAction[] { return this._depositActions; }
  get withdrawalActions(): WithdrawalAction[] { return this._withdrawalActions; }

  get deposits(): Deposit[] { return this._deposits; }
  get withdrawals(): Withdrawal[] { return this._withdrawals; }

  get totalDeposits(): number {
    let deposits = 0;
    this.deposits.forEach((d) => {
      deposits += d.deposit;
    });

    return deposits;
  }

  get totalWithdrawals(): number {
    let withdrawals = 0;
    this.withdrawals.forEach((w) => {
      withdrawals += w.cost;
    });

    return withdrawals;
  }

  constructor(
    protected _userId: string,
    protected _name: string,
    protected _description: string,
    depositActions?: DepositAction[] | null,
    withdrawalActions?: WithdrawalAction[] | null,
    deposits?: Deposit[] | null,
    withdrawals?: Withdrawal[] | null,
  ) {
    this._depositActions = depositActions ?? [];
    this._withdrawalActions = withdrawalActions ?? [];
    this._deposits = deposits ?? [];
    this._withdrawals = withdrawals ?? [];
  }

  sortDepositActions() {
    this.depositActions.sort((a, b) => {
      if (a.sortedLocation < b.sortedLocation) return -1;
      if (a.sortedLocation > b.sortedLocation) return 1;
      return 0;
    });
  }

  sortWithdrawalActions() {
    this.withdrawalActions.sort((a, b) => {
      if (a.sortedLocation < b.sortedLocation) return -1;
      if (a.sortedLocation > b.sortedLocation) return 1;
      return 0;
    });
  }

  addDeposit(d: Deposit) {
    this.deposits.push(d);
    this.calculateTotalCurrency();
  }

  addWithdrawal(w: Withdrawal) {
    this.withdrawals.push(w);
    this.calculateTotalCurrency();
  }

  calculateTotalCurrency() {
    this._totalCurrency = this.totalDeposits - this.totalWithdrawals;
  }

  setActionsAndExchanges(
    depositActions: DepositAction[],
    withdrawalActions: WithdrawalAction[],
    deposits: Deposit[],
    withdrawals: Withdrawal[]
  ) {
    this._depositActions = depositActions;
    this._withdrawalActions = withdrawalActions;
    this._deposits = deposits;
    this._withdrawals = withdrawals;

    this.calculateTotalCurrency();
  }

  toJSON() {
    return {
      userId: this.userId,
      name: this.name,
    };
  }
}

class Exchange extends NewExchange {
  get id(): string { return this._id; }

  constructor(
    protected _id: string,
    userId: string,
    name: string,
    description: string,
    depositActions?: DepositAction[] | null,
    withdrawalActions?: WithdrawalAction[] | null,
    deposits?: Deposit[] | null,
    withdrawals?: Withdrawal[] | null,
  ) {
    super(userId, name, description, depositActions, withdrawalActions, deposits, withdrawals);
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
    };
  }

  static fromNewExchange(id: string, newExchange: NewExchange) {
    return new Exchange(
      id,
      newExchange.userId,
      newExchange.name,
      newExchange.description,
      newExchange.depositActions,
      newExchange.withdrawalActions,
      newExchange.deposits,
      newExchange.withdrawals,
    );
  }

  static fromJSON(rawJson: unknown): Exchange {
    if (!isRecord(rawJson)
      || !isString(rawJson.id)
      || !isString(rawJson.userId)
      || !isString(rawJson.name)
      || !isString(rawJson.description)
    ){
      throw new InvalidJSONException('Invalid Data');
    }

    return new Exchange(rawJson.id, rawJson.userId, rawJson.name, rawJson.description);
  }
}

export {
  Exchange,
  NewExchange,
};