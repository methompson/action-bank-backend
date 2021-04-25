import { WithdrawalAction } from '@dataTypes/action';

class Withdrawal {
  constructor(
    private _quant: number,
    private _withdrawal: WithdrawalAction,
  ) {}

  get quant(): number {
    return this._quant;
  }

  get withdrawal(): WithdrawalAction {
    return this._withdrawal;
  }
}

export {
  Withdrawal,
};