import { DepositAction } from '@dataTypes/action';

class Deposit {
  constructor(
    private _deposit: DepositAction,
    private _quant: number,
  ) {}

  get deposit(): DepositAction {
    return this._deposit;
  }

  get quant(): number {
    return this._quant;
  }
}
export {
  Deposit,
};