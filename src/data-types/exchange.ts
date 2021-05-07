import {
  DepositAction,
  WithdrawalAction,
  Deposit,
  Withdrawal,
} from "@dataTypes";

/**
 * The Exchange keeps track of all the withdrawal actions and deposit actions that can
 * be used with each other. The exhcange will keep track of the amount of currency
 * available to be spent on withdrawals and should be able to calculate the currency
 * from the deposit actions.
 */
class Exchange {
  protected depositActions: DepositAction[] = [];
  protected withdrawalActions: WithdrawalAction[] = [];

  protected deposits: Deposit[] = [];
  protected withdrawals: Withdrawal[] = [];

  protected _totalCurrency = 0;

  get totalCurrency(): number {
    return this._totalCurrency;
  }

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
}

export default Exchange;