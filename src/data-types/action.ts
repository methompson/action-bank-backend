/**
 * An action that allows a user to deposit currency. The exchangeRate dictates
 * how many units of the deposit action correspond to units of currency earned.
 */
// eslint-disable-next-line max-classes-per-file
class DepositAction {
  constructor(
    public name: string,
    public uom: string,
    public uomQuant: number,
    public depositQuant: number,
  ) {}

  get exchangeRate(): number {
    return this.depositQuant / this.uomQuant;
  }

  getCost(actionQuant: number): number {
    return actionQuant * this.exchangeRate;
  }
}

class WithdrawalAction {
  constructor(
    public name: string,
    public uom: string,
    public uomQuant: number,
    public withdrawalQuant: number,
  ) {}

  get exchangeRate(): number {
    return this.withdrawalQuant / this.uomQuant;
  }

  getCost(actionQuant: number): number {
    return actionQuant * this.exchangeRate;
  }
}

export {
  DepositAction,
  WithdrawalAction,
};