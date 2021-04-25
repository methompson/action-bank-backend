import { Deposit } from '@dataTypes/deposit';
import { Withdrawal } from '@dataTypes/withdrawal';

class Currency {
  protected currentAmount = 0;

  protected deposits: Deposit[] = [];
  protected withdrawals: Withdrawal[] = [];

  deposit(action: Deposit) {
    this.deposits.push(action);
    this.calculateTotal();
  }

  withdraw(action: Withdrawal) {
    this.withdrawals.push(action);
    this.calculateTotal();
  }

  calculateTotal(): number {
    let total = 0;
    this.deposits.forEach((d) => {
      const deposit =  d.deposit.getCost(d.quant);
      total += deposit;
    });

    this.withdrawals.forEach((w) => {
      const withdrawal = w.quant * w.withdrawal.exchangeRate;
      total -= withdrawal;
    });

    return total;
  }
}

export default Currency;