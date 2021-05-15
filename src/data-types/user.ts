// tslint:disable:max-classes-per-file

import { UserTypeMap, UserType } from '@dataTypes/';
import { isFunction } from 'node:util';

function isObject(val: Record<string, unknown> | unknown | undefined | null): val is Record<string, unknown> {
  return typeof val === 'object' && !Array.isArray(val);
}

class NewUser {
  constructor(
    protected _username: string,
    protected _email: string,
    protected _firstName: string,
    protected _lastName: string,
    protected _userType: UserType,
    protected _passwordHash: string,
    protected _userMeta: Record<string, unknown>,
    protected _enabled: boolean,
    protected _dateAdded: number,
    protected _dateUpdated: number,
    protected _passwordResetToken: string,
    protected _passwordResetDate: number,
  ) {}

  get username(): string { return this._username; }
  get email(): string { return this._email; }
  get firstName(): string { return this._firstName; }
  get lastName(): string { return this._lastName; }
  get userType(): UserType { return this._userType; }
  get passwordHash(): string { return this._passwordHash; }
  get userMeta(): Record<string, unknown> { return this._userMeta; }
  get enabled(): boolean { return this._enabled; }
  get dateAdded(): number { return this._dateAdded; }
  get dateUpdated(): number { return this._dateUpdated; }
  get passwordResetToken(): string { return this._passwordResetToken; }
  get passwordResetDate(): number { return this._passwordResetDate; }

  toJSON() {
    return {
      username: this.username,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      userType: this.userType.toString(),
      passwordHash: this.passwordHash,
      userMeta: this.userMeta,
      enabled: this.enabled,
      dateAdded: this.dateAdded,
      dateUpdated:this.dateUpdated,
      passwordResetToken: this.passwordResetToken,
      passwordResetDate: this.passwordResetDate,
    };
  }

  static fromJson(rawJson: unknown, userTypeMap: UserTypeMap): NewUser {
    if (!isObject(rawJson)) {
      throw new Error('Invalid Data');
    }

    if (typeof rawJson.username !== 'string'
      || typeof rawJson.email !== 'string'
      || typeof rawJson.password !== 'string') {
      throw new Error('Invalid Data');
    }

    const userMeta = isObject(rawJson.userMeta) ? rawJson.userMeta : {};
    const enabled = typeof rawJson.enabled === 'boolean' ? rawJson.enabled : true;

    const firstName = typeof rawJson.firstName === 'string'
      ? rawJson.firstName
      : '';
    const lastName = typeof rawJson.lastName === 'string'
      ? rawJson.lastName
      : '';
    const userType = typeof rawJson.userType === 'string'
      ? rawJson.userType
      : '';

    const now = new Date().getTime();

    const user = new NewUser(
      rawJson.username,
      rawJson.email,
      firstName,
      lastName,
      userTypeMap.getUserType(userType),
      rawJson.password,
      userMeta,
      enabled,
      now,
      now,
      '',
      0,
    );

    return user;
  }
}

class User extends NewUser {
  constructor(
    protected _id: string,
    username: string,
    email: string,
    firstName: string,
    lastName: string,
    userType: UserType,
    passwordHash: string,
    userMeta: Record<string, unknown>,
    enabled: boolean,
    dateAdded: number,
    dateUpdated: number,
    passwordResetToken: string,
    passwordResetDate: number,
  ) {
    super(
      username,
      email,
      firstName,
      lastName,
      userType,
      passwordHash,
      userMeta,
      enabled,
      dateAdded,
      dateUpdated,
      passwordResetToken,
      passwordResetDate,
    );
  }

  get id(): string { return this._id; }

  get graphQLObject() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      userType: this.userType.name,
      userMeta: JSON.stringify(this.userMeta),
      dateAdded: this.dateAdded,
      dateUpdated: this.dateUpdated,
    };
  }

  mergeEdits(data: Record<string, unknown>, userTypeMap: UserTypeMap): User {
    const username = typeof data.username === 'string'
      ? data.username
      : this.username;

    const email = typeof data.email === 'string'
      ? data.email
      : this.email;
    const firstName = typeof data.firstName === 'string'
      ? data.firstName
      : this.firstName;
    const lastName = typeof data.lastName === 'string'
      ? data.lastName
      : this.lastName;

    const userType = typeof data.userType === 'string'
      ? userTypeMap.getUserType(data.userType)
      : this.userType;

    let userMeta: Record<string, unknown>;

    try {
      userMeta = typeof data.userMeta === 'string'
        ? JSON.parse(data.userMeta)
        : this.userMeta;
    } catch (e) {
      userMeta = this.userMeta;
    }

    const enabled = typeof data.enabled === 'boolean'
      ? data.enabled
      : this.enabled;

    const passwordHash = typeof data.passwordHash === 'string'
      ? data.passwordHash
      : this.passwordHash;

    return new User(
      this.id,
      username,
      email,
      firstName,
      lastName,
      userType,
      passwordHash,
      userMeta,
      enabled,
      this.dateAdded,
      this.dateUpdated,
      this.passwordResetToken,
      this.passwordResetDate,
    );
  }

  static fromJSON(rawJson: unknown, userTypeMap: UserTypeMap): User {
    if (!isObject(rawJson)) {
      throw new Error('Invalid Data');
    }

    let id: string;
    if (typeof rawJson.id === 'string') {
      id = rawJson.id;
    } else if (isObject(rawJson._id) && typeof rawJson._id.toString === 'function') {
      id = rawJson._id.toString();
    } else {
      throw new Error('Invalid Data');
    }

    if (typeof rawJson.username !== 'string'
      || typeof rawJson.email !== 'string'
      || typeof rawJson.userType !== 'string'
      || typeof rawJson.passwordHash !== 'string'
      || typeof rawJson.passwordResetToken !== 'string'
      || (typeof rawJson.passwordResetDate !== 'number' && !(rawJson.passwordResetDate instanceof Date))
      || !isObject(rawJson.userMeta)
      || (typeof rawJson.dateAdded !== 'number' && !(rawJson.dateAdded instanceof Date))
      || (typeof rawJson.dateUpdated !== 'number' && !(rawJson.dateUpdated instanceof Date))
      || typeof rawJson.enabled !== 'boolean'
    ) {
      throw new Error('Invalid Data');
    }

    const passwordResetDate = rawJson.passwordResetDate instanceof Date
      ? rawJson.passwordResetDate.getTime()
      : rawJson.passwordResetDate;

    const dateAdded = rawJson.dateAdded instanceof Date
      ? rawJson.dateAdded.getTime()
      : rawJson.dateAdded;

    const dateUpdated = rawJson.dateUpdated instanceof Date
      ? rawJson.dateUpdated.getTime()
      : rawJson.dateUpdated;

    const firstName = typeof rawJson.firstName === 'string'
      ? rawJson.firstName
      : '';
    const lastName = typeof rawJson.lastName === 'string'
      ? rawJson.lastName
      : '';

    const user = new User(
      id,
      rawJson.username,
      rawJson.email,
      firstName,
      lastName,
      userTypeMap.getUserType(rawJson.userType),
      rawJson.passwordHash,
      rawJson.userMeta,
      rawJson.enabled,
      dateAdded,
      dateUpdated,
      rawJson.passwordResetToken,
      passwordResetDate,
    );

    return user;
  }

  static fromNewUser(user: NewUser, id: string): User {
    return new User(
      id,
      user.username,
      user.email,
      user.firstName,
      user.lastName,
      user.userType,
      user.passwordHash,
      user.userMeta,
      user.enabled,
      user.dateAdded,
      user.dateUpdated,
      user.passwordResetToken,
      user.passwordResetDate,
    );
  }
}

export {
  NewUser,
  User,
};