// tslint:disable:max-classes-per-file

import { UserTypeMap, UserType } from '@dataTypes/';

function isObject(val: Record<string, unknown> | unknown | undefined | null): val is Record<string, unknown> {
  return typeof val === 'object' && !Array.isArray(val);
}

class NewUser {
  constructor(
    public username: string,
    public email: string,
    public firstName: string,
    public lastName: string,
    public userType: UserType,
    public passwordHash: string,
    public userMeta: Record<string, unknown>,
    public enabled: boolean,
  ) {}

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

    const user = new NewUser(
      rawJson.username,
      rawJson.email,
      firstName,
      lastName,
      userTypeMap.getUserType(userType),
      rawJson.password,
      userMeta,
      enabled,
    );

    return user;
  }
}

class User extends NewUser {
  constructor(
    public id: string,
    username: string,
    email: string,
    firstName: string,
    lastName: string,
    userType: UserType,
    passwordHash: string,
    userMeta: Record<string, unknown>,
    enabled: boolean,
    public passwordResetToken: string,
    public passwordResetDate: number,
    public dateAdded: number,
    public dateUpdated: number,
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
    );
  }

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

  static fromJson(rawJson: unknown, userTypeMap: UserTypeMap): User {
    if (!isObject(rawJson)) {
      throw new Error('Invalid Data');
    }

    if (typeof rawJson.username !== 'string'
      || typeof rawJson.email !== 'string'
      || typeof rawJson.userType !== 'string'
      || typeof rawJson.passwordHash !== 'string'
      || typeof rawJson.id !== 'string'
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
      rawJson.id,
      rawJson.username,
      rawJson.email,
      firstName,
      lastName,
      userTypeMap.getUserType(rawJson.userType),
      rawJson.passwordHash,
      rawJson.userMeta,
      rawJson.enabled,
      rawJson.passwordResetToken,
      passwordResetDate,
      dateAdded,
      dateUpdated,
    );

    return user;
  }
}

export {
  NewUser,
  User,
};