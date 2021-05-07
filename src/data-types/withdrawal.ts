class NewWithdrawalAction {
  constructor(
    public name: string,
    public uom: string,
    public uomQuant: number,
    public withdrawalQuant: number,
    public enabled: boolean,
  ) {}

  get exchangeRate(): number {
    return this.withdrawalQuant / this.uomQuant;
  }

  getCost(actionQuant: number): number {
    return actionQuant * this.exchangeRate;
  }
}

class WithdrawalAction extends NewWithdrawalAction {
  constructor(
    public id: string,
    name: string,
    uom: string,
    uomQuant: number,
    withdrawalQuant: number,
    enabled: boolean,
    public sortedLocation: number,
    public dateAdded: number,
    public dateUpdated: number,
  ) {
    super(name, uom, uomQuant, withdrawalQuant, enabled);
  }

  static makeFromNewWithdrawalAction(
    action: NewWithdrawalAction,
    id: string,
    sortedLocation: number,
    dateAdded: number | null,
    dateUpdated: number | null,
  ): WithdrawalAction {
    const now = new Date().getTime();

    const _dateAdded: number = dateAdded === null
      ? now
      : dateAdded;

    const _dateUpdated: number = dateUpdated === null
      ? now
      : dateUpdated;

    return new WithdrawalAction(
      id,
      action.name,
      action.uom,
      action.uomQuant,
      action.withdrawalQuant,
      action.enabled,
      sortedLocation,
      _dateAdded,
      _dateUpdated,
    );
  }
}

class NewWithdrawal {
  constructor(
    protected _withdrawalActionId: string,
    protected _withdrawalActionName: string,
    protected _uomQuant: number,
    protected _withdrawalQuant: number,
    protected _quant: number,
  ) {}

  get withdrawalActionId(): string { return this._withdrawalActionId; }
  get withdrawalActionName(): string { return this._withdrawalActionName; }
  get uomQuant(): number { return this._uomQuant; }
  get withdrawalQuant(): number { return this._withdrawalQuant; }
  get quant(): number { return this._quant; }

  get exchangeRate(): number {
    return this.withdrawalQuant / this.uomQuant;
  }

  get cost(): number {
    return this.quant * this.exchangeRate;
  }

  static fromWithdrawalAction(withdrawal: WithdrawalAction, quant: number): NewWithdrawal {
    return new NewWithdrawal(
      withdrawal.id,
      withdrawal.name,
      withdrawal.uomQuant,
      withdrawal.withdrawalQuant,
      quant,
    );
  }
}

class Withdrawal extends NewWithdrawal {
  constructor(
    protected _id: string,
    withdrawalActionId: string,
    withdrawalActionName: string,
    uomQuant: number,
    withdrawalQuant: number,
    quant: number,
    protected _dateAdded: number
  ) {
    super(
      withdrawalActionId,
      withdrawalActionName,
      uomQuant,
      withdrawalQuant,
      quant,
    );
  }

  get id(): string { return this._id; }

  static fromNewWithdrawal(withdrawal: NewWithdrawal, id: string): Withdrawal {
    return new Withdrawal(
      id,
      withdrawal.withdrawalActionId,
      withdrawal.withdrawalActionName,
      withdrawal.uomQuant,
      withdrawal.withdrawalQuant,
      withdrawal.quant,
      new Date().getTime(),
    );
  }
}

export {
  NewWithdrawalAction,
  WithdrawalAction,
  NewWithdrawal,
  Withdrawal,
};