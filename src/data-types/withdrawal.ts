import { InvalidJSONException } from "@root/exceptions/data-controller-exceptions";
import {
  isBoolean,
  isNumber,
  isRecord,
  isString,
} from "./type-guards";

class NewWithdrawalAction {
  protected _dateAdded: number;
  protected _dateUpdated: number;

  constructor(
    protected _userId: string,
    protected _exchangeId: string,
    protected _name: string,
    protected _uom: string,
    protected _uomQuantity: number,
    protected _withdrawalQuantity: number,
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
  get withdrawalQuantity(): number { return this._withdrawalQuantity; }
  get enabled(): boolean { return this._enabled; }
  get dateAdded(): number { return this._dateAdded; }
  get dateUpdated(): number { return this._dateUpdated; }

  get exchangeRate(): number {
    return this.withdrawalQuantity / this.uomQuantity;
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
      withdrawalQuantity: this.withdrawalQuantity,
      enabled: this.enabled,
      dateAdded: this.dateAdded,
      dateUpdated: this.dateUpdated,
    };
  }
}

class WithdrawalAction extends NewWithdrawalAction {
  constructor(
    protected _id: string,
    userId: string,
    exchangeId: string,
    name: string,
    uom: string,
    uomQuantity: number,
    withdrawalQuantity: number,
    enabled: boolean,
    dateAdded: number,
    dateUpdated: number,
    protected _sortedLocation: number,
  ) {
    super(userId, exchangeId, name, uom, uomQuantity, withdrawalQuantity, enabled, dateAdded, dateUpdated);
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
      withdrawalQuantity: this.withdrawalQuantity,
      enabled: this.enabled,
      dateAdded: this.dateAdded,
      dateUpdated: this.dateUpdated,
      sortedLocation: this.sortedLocation,
    };
  }

  static fromNewWithdrawalAction(
    action: NewWithdrawalAction,
    id: string,
    sortedLocation?: number | null,
  ): WithdrawalAction {

    const _sortedLocation = sortedLocation ?? -1;

    return new WithdrawalAction(
      id,
      action.userId,
      action.exchangeId,
      action.name,
      action.uom,
      action.uomQuantity,
      action.withdrawalQuantity,
      action.enabled,
      action.dateAdded,
      action.dateUpdated,
      _sortedLocation,
    );
  }

  static fromJSON(rawJson: unknown): WithdrawalAction {
    if (!isRecord(rawJson)
      || !isString(rawJson.id)
      || !isString(rawJson.userId)
      || !isString(rawJson.exchangeId)
      || !isString(rawJson.name)
      || !isString(rawJson.uom)
      || !isNumber(rawJson.uomQuantity)
      || !isNumber(rawJson.withdrawalQuantity)
      || !isBoolean(rawJson.enabled)
      || !isNumber(rawJson.dateAdded)
      || !isNumber(rawJson.dateUpdated)
      || !isNumber(rawJson.sortedLocation)
    ) {
      throw new InvalidJSONException('Invalid Data');
    }

    return new WithdrawalAction(
      rawJson.id,
      rawJson.userId,
      rawJson.exchangeId,
      rawJson.name,
      rawJson.uom,
      rawJson.uomQuantity,
      rawJson.withdrawalQuantity,
      rawJson.enabled,
      rawJson.dateAdded,
      rawJson.dateUpdated,
      rawJson.sortedLocation,
    );
  }
}

class NewWithdrawal {
  protected _dateAdded: number;

  constructor(
    protected _userId: string,
    protected _exchangeId: string,
    protected _withdrawalActionId: string,
    protected _withdrawalActionName: string,
    protected _uomQuantity: number,
    protected _withdrawalQuantity: number,
    protected _quantity: number,
    _dateAdded?: number
  ) {
    this._dateAdded = _dateAdded ?? new Date().getTime();
  }

  get userId(): string { return this._userId; }
  get exchangeId(): string { return this._exchangeId; }
  get withdrawalActionId(): string { return this._withdrawalActionId; }
  get withdrawalActionName(): string { return this._withdrawalActionName; }
  get uomQuantity(): number { return this._uomQuantity; }
  get withdrawalQuantity(): number { return this._withdrawalQuantity; }
  get quantity(): number { return this._quantity; }
  get dateAdded(): number { return this._dateAdded; }

  get exchangeRate(): number {
    return this.withdrawalQuantity / this.uomQuantity;
  }

  get cost(): number {
    return this.quantity * this.exchangeRate;
  }

  toJSON() {
    return {
      userId: this.userId,
      exchangeId: this.exchangeId,
      withdrawalActionId: this.withdrawalActionId,
      withdrawalActionName: this.withdrawalActionName,
      uomQuantity: this.uomQuantity,
      withdrawalQuantity: this.withdrawalQuantity,
      quantity: this.quantity,
      dateAdded: this.dateAdded,
    };
  }

  static fromWithdrawalAction(withdrawal: WithdrawalAction, userId: string, quantity: number): NewWithdrawal {
    return new NewWithdrawal(
      userId,
      withdrawal.exchangeId,
      withdrawal.id,
      withdrawal.name,
      withdrawal.uomQuantity,
      withdrawal.withdrawalQuantity,
      quantity,
    );
  }
}

class Withdrawal extends NewWithdrawal {
  constructor(
    protected _id: string,
    userId: string,
    exchangeId: string,
    withdrawalActionId: string,
    withdrawalActionName: string,
    uomQuantity: number,
    withdrawalQuantity: number,
    quantity: number,
    dateAdded: number
  ) {
    super(
      userId,
      exchangeId,
      withdrawalActionId,
      withdrawalActionName,
      uomQuantity,
      withdrawalQuantity,
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
      withdrawalActionId: this.withdrawalActionId,
      withdrawalActionName: this.withdrawalActionName,
      uomQuantity: this.uomQuantity,
      withdrawalQuantity: this.withdrawalQuantity,
      quantity: this.quantity,
      dateAdded: this.dateAdded,
    };
  }

  static fromJSON(rawJson: unknown): Withdrawal {
    if (!isRecord(rawJson)
      || !isString(rawJson.id)
      || !isString(rawJson.userId)
      || !isString(rawJson.exchangeId)
      || !isString(rawJson.withdrawalActionId)
      || !isString(rawJson.withdrawalActionName)
      || !isNumber(rawJson.uomQuantity)
      || !isNumber(rawJson.withdrawalQuantity)
      || !isNumber(rawJson.quantity)
      || !isNumber(rawJson.dateAdded)
    ) {
      throw new InvalidJSONException('Invalid Data');
    }

    return new Withdrawal(
      rawJson.id,
      rawJson.userId,
      rawJson.exchangeId,
      rawJson.withdrawalActionId,
      rawJson.withdrawalActionName,
      rawJson.uomQuantity,
      rawJson.withdrawalQuantity,
      rawJson.quantity,
      rawJson.dateAdded,
    );
  }

  static fromNewWithdrawal(withdrawal: NewWithdrawal, id: string): Withdrawal {
    return new Withdrawal(
      id,
      withdrawal.userId,
      withdrawal.exchangeId,
      withdrawal.withdrawalActionId,
      withdrawal.withdrawalActionName,
      withdrawal.uomQuantity,
      withdrawal.withdrawalQuantity,
      withdrawal.quantity,
      withdrawal.dateAdded,
    );
  }
}

export {
  NewWithdrawalAction,
  WithdrawalAction,
  NewWithdrawal,
  Withdrawal,
};