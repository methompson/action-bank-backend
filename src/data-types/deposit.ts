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
    protected _exchangeId: string,
    protected _name: string,
    protected _uom: string,
    protected _uomQuantity: number,
    protected _depositQuantity: number,
    protected _enabled: boolean,
  ) {}

  get userId(): string { return this._userId; }
  get exchangeId(): string { return this._exchangeId; }
  get name(): string { return this._name; }
  get uom(): string { return this._uom; }
  get uomQuantity(): number { return this._uomQuantity; }
  get depositQuantity(): number { return this._depositQuantity; }
  get enabled(): boolean { return this._enabled; }

  get exchangeRate(): number {
    return this.depositQuantity / this.uomQuantity;
  }

  getCost(actionQuantity: number): number {
    return actionQuantity * this.exchangeRate;
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
    protected _sortedLocation: number,
    protected _dateAdded: number,
    protected _dateUpdated: number,
  ) {
    super(userId, exchangeId, name, uom, uomQuantity, depositQuantity, enabled);
  }

  get id(): string { return this._id; }
  get sortedLocation(): number { return this._sortedLocation; }
  get dateAdded(): number { return this._dateAdded; }
  get dateUpdated(): number { return this._dateUpdated; }

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
      dep.exchangeId,
      dep.name,
      dep.uom,
      dep.uomQuantity,
      dep.depositQuantity,
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
      || !isString(rawJson.exchangeId)
      || !isString(rawJson.name)
      || !isString(rawJson.uom)
      || !isNumber(rawJson.uomQuantity)
      || !isNumber(rawJson.depositQuantity)
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
      rawJson.exchangeId,
      rawJson.name,
      rawJson.uom,
      rawJson.uomQuantity,
      rawJson.depositQuantity,
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
    protected _userId: string,
    protected _exchangeId: string,
    protected _depositActionId: string,
    protected _depositActionName: string,
    protected _uomQuantity: number,
    protected _depositQuantity: number,
    protected _quantity: number,
  ) {}

  get userId(): string { return this._userId; }
  get exchangeId(): string { return this._exchangeId; }
  get depositActionId(): string { return this._depositActionId; }
  get depositActionName(): string { return this._depositActionName; }
  get uomQuantity(): number { return this._uomQuantity; }
  get depositQuantity(): number { return this._depositQuantity; }
  get quantity(): number { return this._quantity; }

  get exchangeRate(): number {
    return this.depositQuantity / this.uomQuantity;
  }

  get deposit(): number {
    return this.quantity * this.exchangeRate;
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
    protected _dateAdded: number
  ) {
    super(userId, exchangeId, depositActionId, depositActionName, uomQuantity, depositQuantity, quantity);
  }

  get id(): string { return this._id; }
  get dateAdded(): number { return this._dateAdded; }

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