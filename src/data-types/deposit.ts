import { InvalidJSONException } from "@root/exceptions/data-controller-exceptions";
import {
  isBoolean,
  isNumber,
  isRecord,
  isString,
} from "./type-guards";

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
    protected _userId: string,
    protected _name: string,
    protected _uom: string,
    protected _uomQuant: number,
    protected _depositQuant: number,
    protected _enabled: boolean,
  ) {}

  get userId(): string { return this._userId; }
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
    userId: string,
    name: string,
    uom: string,
    uomQuant: number,
    depositQuant: number,
    enabled: boolean,
    protected _sortedLocation: number,
    protected _dateAdded: number,
    protected _dateUpdated: number,
  ) {
    super(userId, name, uom, uomQuant, depositQuant, enabled);
  }

  get id(): string { return this._id; }
  get sortedLocation(): number { return this._sortedLocation; }
  get dateAdded(): number { return this._dateAdded; }
  get dateUpdated(): number { return this._dateUpdated; }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      uom: this.uom,
      uomQuant: this.uomQuant,
      depositQuant: this.depositQuant,
      enabled: this.enabled,
      sortedLocation: this.sortedLocation,
      dateAdded: this.dateAdded,
      dateUpdated: this.dateUpdated,
    };
  }

  static fromNewDepositAction(
    dep: NewDepositAction,
    id: string,
    _sortedLocation?: number | null,
    dateAdded?: number | null,
    dateUpdated?: number | null,
  ): DepositAction {
    const now = new Date().getTime();

    const _dateAdded: number = dateAdded ?? now;

    const _dateUpdated: number = dateUpdated ?? now;

    // TODO figure this out
    const sortedLocation = _sortedLocation ?? -1;

    return new DepositAction(
      id,
      dep.userId,
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

  static fromJSON(rawJson: unknown): DepositAction {
    if (!isRecord(rawJson)
      || !isString(rawJson.id)
      || !isString(rawJson.userId)
      || !isString(rawJson.name)
      || !isString(rawJson.uom)
      || !isNumber(rawJson.uomQuant)
      || !isNumber(rawJson.depositQuant)
      || !isBoolean(rawJson.enabled)
      || !isNumber(rawJson.sortedLocation)
      || !isNumber(rawJson.dateAdded)
      || !isNumber(rawJson.dateUpdated)
    ) {
      throw new InvalidJSONException('Invalid Data');
    }

    return new DepositAction(
      rawJson.id,
      rawJson.userId,
      rawJson.name,
      rawJson.uom,
      rawJson.uomQuant,
      rawJson.depositQuant,
      rawJson.enabled,
      rawJson.sortedLocation,
      rawJson.dateAdded,
      rawJson.dateUpdated,
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