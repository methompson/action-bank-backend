import { InvalidJSONException } from "@root/exceptions/data-controller-exceptions";
import {
  isBoolean,
  isNumber,
  isRecord,
  isString,
} from "./type-guards";

class NewWithdrawalAction {
  constructor(
    protected _userId: string,
    protected _exchangeId: string,
    protected _name: string,
    protected _uom: string,
    protected _uomQuantity: number,
    protected _withdrawalQuantity: number,
    protected _enabled: boolean,
  ) {}

  get userId(): string { return this._userId; }
  get exchangeId(): string { return this._exchangeId; }
  get name(): string { return this._name; }
  get uom(): string { return this._uom; }
  get uomQuantity(): number { return this._uomQuantity; }
  get withdrawalQuantity(): number { return this._withdrawalQuantity; }
  get enabled(): boolean { return this._enabled; }

  get exchangeRate(): number {
    return this.withdrawalQuantity / this.uomQuantity;
  }

  getCost(actionQuant: number): number {
    return actionQuant * this.exchangeRate;
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
    protected _sortedLocation: number,
    protected _dateAdded: number,
    protected _dateUpdated: number,
  ) {
    super(userId, exchangeId, name, uom, uomQuantity, withdrawalQuantity, enabled);
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
      withdrawalQuantity: this.withdrawalQuantity,
      enabled: this.enabled,
      sortedLocation: this.sortedLocation,
      dateAdded: this.dateAdded,
      dateUpdated: this.dateUpdated,
    };
  }

  static fromNewWithdrawalAction(
    action: NewWithdrawalAction,
    id: string,
    sortedLocation?: number | null,
    dateAdded?: number | null,
    dateUpdated?: number | null,
  ): WithdrawalAction {
    const now = new Date().getTime();

    const _sortedLocation = sortedLocation ?? -1;
    const _dateAdded: number = dateAdded ?? now;
    const _dateUpdated: number = dateUpdated ?? now;

    return new WithdrawalAction(
      id,
      action.userId,
      action.exchangeId,
      action.name,
      action.uom,
      action.uomQuantity,
      action.withdrawalQuantity,
      action.enabled,
      _sortedLocation,
      _dateAdded,
      _dateUpdated,
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
      || !isNumber(rawJson.sortedLocation)
      || !isNumber(rawJson.dateAdded)
      || !isNumber(rawJson.dateUpdated)
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
      rawJson.sortedLocation,
      rawJson.dateAdded,
      rawJson.dateUpdated,
    );
  }
}

class NewWithdrawal {
  constructor(
    protected _userId: string,
    protected _exchangeId: string,
    protected _withdrawalActionId: string,
    protected _withdrawalActionName: string,
    protected _uomQuantity: number,
    protected _withdrawalQuantity: number,
    protected _quantity: number,
  ) {}

  get userId(): string { return this._userId; }
  get exchangeId(): string { return this._exchangeId; }
  get withdrawalActionId(): string { return this._withdrawalActionId; }
  get withdrawalActionName(): string { return this._withdrawalActionName; }
  get uomQuantity(): number { return this._uomQuantity; }
  get withdrawalQuantity(): number { return this._withdrawalQuantity; }
  get quantity(): number { return this._quantity; }

  get exchangeRate(): number {
    return this.withdrawalQuantity / this.uomQuantity;
  }

  get cost(): number {
    return this.quantity * this.exchangeRate;
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
    protected _dateAdded: number
  ) {
    super(
      userId,
      exchangeId,
      withdrawalActionId,
      withdrawalActionName,
      uomQuantity,
      withdrawalQuantity,
      quantity,
    );
  }

  get id(): string { return this._id; }
  get dateAdded(): number { return this._dateAdded; }

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