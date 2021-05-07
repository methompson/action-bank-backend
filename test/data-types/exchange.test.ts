import { Deposit, Exchange, Withdrawal } from '@dataTypes';

const d1 = new Deposit('1', '1', 3, 1, 1, 1);
const d2 = new Deposit('2', '1', 3, 1, 5, 2);
const d3 = new Deposit('3', '1', 3, 1, 9, 3);
const d4 = new Deposit('4', '1', 3, 1, 20, 4);

const w1 = new Withdrawal('1', '1', 1, 2, 1, 1);
const w2 = new Withdrawal('1', '1', 1, 2, 2, 2);
const w3 = new Withdrawal('1', '1', 1, 2, 4, 3);
const w4 = new Withdrawal('1', '1', 1, 2, 8, 4);

describe('Exchange', () => {
  test('Creating an Exchange Object', () => {
    const ex = new Exchange();
    expect(ex.totalCurrency).toBe(0);
  });

  test('Add a deposit', () => {
    const ex = new Exchange();

    ex.addDeposit(d1);

    expect(ex.totalCurrency).toBe(d1.deposit);
  });

  test('Add several deposits', () => {
    const ex = new Exchange();

    ex.addDeposit(d1);
    ex.addDeposit(d2);
    ex.addDeposit(d3);
    ex.addDeposit(d4);

    const expectedTotal = d1.deposit + d2.deposit + d3.deposit + d4.deposit;

    expect(ex.totalCurrency).toBe(expectedTotal);
    expect(ex.totalDeposits).toBe(expectedTotal);
  });

  test('Add a withdrawal', () => {
    const ex = new Exchange();

    ex.addWithdrawal(w1);

    expect(ex.totalCurrency).toBe(w1.cost * -1);
  });

  test('Add several withdrawals', () => {
    const ex = new Exchange();

    ex.addWithdrawal(w1);
    ex.addWithdrawal(w2);
    ex.addWithdrawal(w3);
    ex.addWithdrawal(w4);

    const expectedCost = w1.cost + w2.cost + w3.cost + w4.cost;

    expect(ex.totalCurrency).toBe(expectedCost * -1);
    expect(ex.totalWithdrawals).toBe(expectedCost);
  });
});