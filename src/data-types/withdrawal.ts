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
    protected _name: string,
    protected _uom: string,
    protected _uomQuant: number,
    protected _withdrawalQuant: number,
    protected _enabled: boolean,
  ) {}

  get userId(): string { return this._userId; }
  get name(): string { return this._name; }
  get uom(): string { return this._uom; }
  get uomQuant(): number { return this._uomQuant; }
  get withdrawalQuant(): number { return this._withdrawalQuant; }
  get enabled(): boolean { return this._enabled; }

  get exchangeRate(): number {
    return this.withdrawalQuant / this.uomQuant;
  }

  getCost(actionQuant: number): number {
    return actionQuant * this.exchangeRate;
  }
}

class WithdrawalAction extends NewWithdrawalAction {
  constructor(
    protected _id: string,
    userId: string,
    name: string,
    uom: string,
    uomQuant: number,
    withdrawalQuant: number,
    enabled: boolean,
    protected _sortedLocation: number,
    protected _dateAdded: number,
    protected _dateUpdated: number,
  ) {
    super(userId, name, uom, uomQuant, withdrawalQuant, enabled);
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
      withdrawalQuant: this.withdrawalQuant,
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
      action.name,
      action.uom,
      action.uomQuant,
      action.withdrawalQuant,
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
      || !isString(rawJson.name)
      || !isString(rawJson.uom)
      || !isNumber(rawJson.uomQuant)
      || !isNumber(rawJson.withdrawalQuant)
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
      rawJson.name,
      rawJson.uom,
      rawJson.uomQuant,
      rawJson.withdrawalQuant,
      rawJson.enabled,
      rawJson.sortedLocation,
      rawJson.dateAdded,
      rawJson.dateUpdated,
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