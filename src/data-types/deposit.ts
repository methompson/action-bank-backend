/**
 * The NewDepositAction class defines the basic values of a deposit action.
 *
 * name refers to the action's name, e.g. 'Ride a Bike'
 * uom, or unit-of-measure refers to how you quantity an action, e.g. "Minutes Ridden"
 * uomQuant & depositQuant are the numerator and denominator of the exchange rate
 * respectively.
 */
class NewDepositAction {
  constructor(
    protected _name: string,
    protected _uom: string,
    protected _uomQuant: number,
    protected _depositQuant: number,
    protected _enabled: boolean,
  ) {}

  get name(): string { return this._name; }
  get uom(): string { return this._uom; }
  get uomQuant(): number { return this._uomQuant; }
  get depositQuant(): number { return this._depositQuant; }
  get enabled(): boolean { return this._enabled; }

  get exchangeRate(): number {
    return this.depositQuant / this.uomQuant;
  }

  getCost(actionQuant: number): number {
    return actionQuant * this.exchangeRate;
  }
}

class DepositAction extends NewDepositAction {
  deposits: Deposit[] = [];

  constructor(
    protected _id: string,
    name: string,
    uom: string,
    uomQuant: number,
    depositQuant: number,
    enabled: boolean,
    public sortedLocation: number,
    public dateAdded: number,
    public dateUpdated: number,
  ) {
    super(name, uom, uomQuant, depositQuant, enabled);
  }

  get id(): string { return this._id; }

  static makeFromNewDepositAction(
    dep: NewDepositAction,
    id: string,
    sortedLocation: number,
    dateAdded: number | null,
    dateUpdated: number | null,
  ): DepositAction {
    const now = new Date().getTime();

    const _dateAdded: number = dateAdded === null
      ? now
      : dateAdded;

    const _dateUpdated: number = dateUpdated === null
      ? now
      : dateUpdated;

    return new DepositAction(
      id,
      dep.name,
      dep.uom,
      dep.uomQuant,
      dep.depositQuant,
      dep.enabled,
      sortedLocation,
      _dateAdded,
      _dateUpdated,
    );
  }
}

/**
 * The NewDeposit class represents the raw data that makes up a deposit. We save
 * the raw information about the deposit action, including uomQuant and depositQuant
 * because a user may change the information about the deposit action and we don't
 * want that to affect past deposits. Each deposit represents a frozen slice in time.
 */
class NewDeposit {
  constructor(
    protected _depositActionId: string,
    protected _depositActionName: string,
    protected _uomQuant: number,
    protected _depositQuant: number,
    protected _quant: number,
  ) {}

  get depositActionId(): string { return this._depositActionId; }
  get depositActionName(): string { return this._depositActionName; }
  get uomQuant(): number { return this._uomQuant; }
  get depositQuant(): number { return this._depositQuant; }
  get quant(): number { return this._quant; }

  get exchangeRate(): number {
    return this.depositQuant / this.uomQuant;
  }

  get deposit(): number {
    return this.quant * this.exchangeRate;
  }

  static fromDepositAction(deposit: DepositAction, quant: number) {
    return new NewDeposit(
      deposit.id,
      deposit.name,
      deposit.uomQuant,
      deposit.depositQuant,
      quant,
    );
  }
}

class Deposit extends NewDeposit {
  constructor(
    protected _id: string,
    depositActionId: string,
    depositActionName: string,
    uomQuant: number,
    depositQuant: number,
    quant: number,
    protected _dateAdded: number
  ) {
    super(depositActionId, depositActionName, uomQuant, depositQuant, quant);
  }

  get id(): string { return this._id; }
  get dateAdded(): number { return this._dateAdded; }

  static makeFromNewDeposit(dep: NewDeposit, id: string): Deposit {
    return new Deposit(
      id,
      dep.depositActionId,
      dep.depositActionName,
      dep.uomQuant,
      dep.depositQuant,
      dep.quant,
      new Date().getTime(),
    );
  }
}

export {
  NewDepositAction,
  DepositAction,
  NewDeposit,
  Deposit,
};