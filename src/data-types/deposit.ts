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
 * uomQuantity & depositQuantity are the numerator and denominator of the exchange rate
 * respectively.
 */
class NewDepositAction {
  protected _dateAdded: number;
  protected _dateUpdated: number;

  constructor(
    protected _userId: string,
    protected _exchangeId: string,
    protected _name: string,
    protected _uom: string,
    protected _uomQuantity: number,
    protected _depositQuantity: number,
    protected _enabled: boolean,
    _dateAdded?: number,
    _dateUpdated?: number,
  ) {
    const now = new Date().getTime();
    this._dateAdded = _dateAdded ?? now;
    this._dateUpdated = _dateUpdated ?? now;
  }

  get userId(): string { return this._userId; }
  get exchangeId(): string { return this._exchangeId; }
  get name(): string { return this._name; }
  get uom(): string { return this._uom; }
  get uomQuantity(): number { return this._uomQuantity; }
  get depositQuantity(): number { return this._depositQuantity; }
  get enabled(): boolean { return this._enabled; }
  get dateAdded(): number { return this._dateAdded; }
  get dateUpdated(): number { return this._dateUpdated; }

  get exchangeRate(): number {
    return this.depositQuantity / this.uomQuantity;
  }

  getCost(actionQuantity: number): number {
    return actionQuantity * this.exchangeRate;
  }

  toJSON() {
    return {
      userId: this.userId,
      exchangeId: this.exchangeId,
      name: this.name,
      uom: this.uom,
      uomQuantity: this.uomQuantity,
      depositQuantity: this.depositQuantity,
      enabled: this.enabled,
      dateAdded: this.dateAdded,
      dateUpdated: this.dateUpdated,
    };
  }
}

class DepositAction extends NewDepositAction {
  deposits: Deposit[] = [];

  constructor(
    protected _id: string,
    userId: string,
    exchangeId: string,
    name: string,
    uom: string,
    uomQuantity: number,
    depositQuantity: number,
    enabled: boolean,
    dateAdded: number,
    dateUpdated: number,
    protected _sortedLocation: number,
  ) {
    super(userId, exchangeId, name, uom, uomQuantity, depositQuantity, enabled, dateAdded, dateUpdated);
  }

  get id(): string { return this._id; }
  get sortedLocation(): number { return this._sortedLocation; }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      exchangeId: this.exchangeId,
      name: this.name,
      uom: this.uom,
      uomQuantity: this.uomQuantity,
      depositQuantity: this.depositQuantity,
      enabled: this.enabled,
      dateAdded: this.dateAdded,
      dateUpdated: this.dateUpdated,
      sortedLocation: this.sortedLocation,
    };
  }

  static fromNewDepositAction(
    action: NewDepositAction,
    id: string,
    _sortedLocation?: number | null,
  ): DepositAction {

    // TODO figure this out
    const sortedLocation = _sortedLocation ?? -1;

    return new DepositAction(
      id,
      action.userId,
      action.exchangeId,
      action.name,
      action.uom,
      action.uomQuantity,
      action.depositQuantity,
      action.enabled,
      action.dateAdded,
      action.dateUpdated,
      sortedLocation,
    );
  }

  static fromJSON(rawJson: unknown): DepositAction {
    if (!isRecord(rawJson)
      || !isString(rawJson.id)
      || !isString(rawJson.userId)
      || !isString(rawJson.exchangeId)
      || !isString(rawJson.name)
      || !isString(rawJson.uom)
      || !isNumber(rawJson.uomQuantity)
      || !isNumber(rawJson.depositQuantity)
      || !isBoolean(rawJson.enabled)
      || !isNumber(rawJson.dateAdded)
      || !isNumber(rawJson.dateUpdated)
      || !isNumber(rawJson.sortedLocation)
    ) {
      throw new InvalidJSONException('Invalid Data');
    }

    return new DepositAction(
      rawJson.id,
      rawJson.userId,
      rawJson.exchangeId,
      rawJson.name,
      rawJson.uom,
      rawJson.uomQuantity,
      rawJson.depositQuantity,
      rawJson.enabled,
      rawJson.dateAdded,
      rawJson.dateUpdated,
      rawJson.sortedLocation,
    );
  }
}

/**
 * The NewDeposit class represents the raw data that makes up a deposit. We save
 * the raw information about the deposit action, including uomQuantity and depositQuantity
 * because a user may change the information about the deposit action and we don't
 * want that to affect past deposits. Each deposit represents a frozen slice in time.
 */
class NewDeposit {
  protected _dateAdded: number;

  constructor(
    protected _userId: string,
    protected _exchangeId: string,
    protected _depositActionId: string,
    protected _depositActionName: string,
    protected _uomQuantity: number,
    protected _depositQuantity: number,
    protected _quantity: number,
    _dateAdded?: number
  ) {
    this._dateAdded = _dateAdded ?? new Date().getTime();
  }

  get userId(): string { return this._userId; }
  get exchangeId(): string { return this._exchangeId; }
  get depositActionId(): string { return this._depositActionId; }
  get depositActionName(): string { return this._depositActionName; }
  get uomQuantity(): number { return this._uomQuantity; }
  get depositQuantity(): number { return this._depositQuantity; }
  get quantity(): number { return this._quantity; }
  get dateAdded(): number { return this._dateAdded; }


  get exchangeRate(): number {
    return this.depositQuantity / this.uomQuantity;
  }

  get deposit(): number {
    return this.quantity * this.exchangeRate;
  }

  toJSON() {
    return {
      userId: this.userId,
      exchangeId: this.exchangeId,
      depositActionId: this.depositActionId,
      depositActionName: this.depositActionName,
      uomQuantity: this.uomQuantity,
      depositQuantity: this.depositQuantity,
      quantity: this.quantity,
      dateAdded: this.dateAdded,
    };
  }

  static fromDepositAction(deposit: DepositAction, userId: string, quantity: number) {
    return new NewDeposit(
      userId,
      deposit.exchangeId,
      deposit.id,
      deposit.name,
      deposit.uomQuantity,
      deposit.depositQuantity,
      quantity,
    );
  }
}

class Deposit extends NewDeposit {
  constructor(
    protected _id: string,
    userId: string,
    exchangeId: string,
    depositActionId: string,
    depositActionName: string,
    uomQuantity: number,
    depositQuantity: number,
    quantity: number,
    dateAdded: number,
  ) {
    super(
      userId,
      exchangeId,
      depositActionId,
      depositActionName,
      uomQuantity,
      depositQuantity,
      quantity,
      dateAdded,
    );
  }

  get id(): string { return this._id; }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      exchangeId: this.exchangeId,
      depositActionId: this.depositActionId,
      depositActionName: this.depositActionName,
      uomQuantity: this.uomQuantity,
      depositQuantity: this.depositQuantity,
      quantity: this.quantity,
      dateAdded: this.dateAdded,
    };
  }

  static fromJSON(rawJson: unknown): Deposit {
    if (!isRecord(rawJson)
      || !isString(rawJson.id)
      || !isString(rawJson.userId)
      || !isString(rawJson.exchangeId)
      || !isString(rawJson.depositActionId)
      || !isString(rawJson.depositActionName)
      || !isNumber(rawJson.uomQuantity)
      || !isNumber(rawJson.depositQuantity)
      || !isNumber(rawJson.quantity)
      || !isNumber(rawJson.dateAdded)
    ) {
      throw new InvalidJSONException('Invalid Data');
    }

    return new Deposit(
      rawJson.id,
      rawJson.userId,
      rawJson.exchangeId,
      rawJson.depositActionId,
      rawJson.depositActionName,
      rawJson.uomQuantity,
      rawJson.depositQuantity,
      rawJson.quantity,
      rawJson.dateAdded,
    );
  }

  static fromNewDeposit(dep: NewDeposit, id: string): Deposit {
    return new Deposit(
      id,
      dep.userId,
      dep.exchangeId,
      dep.depositActionId,
      dep.depositActionName,
      dep.uomQuantity,
      dep.depositQuantity,
      dep.quantity,
      dep.dateAdded,
    );
  }
}

export {
  NewDepositAction,
  DepositAction,
  NewDeposit,
  Deposit,
};