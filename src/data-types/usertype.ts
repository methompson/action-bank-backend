// tslint:disable:max-classes-per-file

interface UserMap {
  [key: string]: UserType;
}

class UserTypeMap {
  private userMap: UserMap;

  constructor() {
    this.userMap = {
      ...defaultUserTypes,
    };
  }

  get userTypes(): UserMap {
    return this.userMap;
  }

  get noneUser(): UserType {
    return new UserType('none', 0);
  }

  getUserType(type: string) {
    if (Object.keys(this.userMap).includes(type) ) {
      return this.userMap[type];
    } else {
      return this.noneUser;
    }
  }

  /**
   * Checks two user types and returns a number indicating firstEl's level's relative
   * comparison to secondEl's level. If firstEl's level is greater than secondEl's,
   * a positive value is returned. If firstEl's level is lower than secondEl's,
   * a negative value is returned. Otherwise, 0 is returned.
   *
   * @param firstEl {UserType} The userType that we are using as a
   * @param secondEl {UserType}
   * @returns {Number}
   */
  compareUserTypeLevels(firstEl: UserType, secondEl: UserType): number {
    if (firstEl.accessLevel > secondEl.accessLevel) {
      return 1;
    }

    if (firstEl.accessLevel < secondEl.accessLevel) {
      return -1;
    }

    return 0;
  }

  /**
   * This method will add a UserMap to the existing usermap.
   * This method enforces the default userTypes, so that we don't override the
   * Admin or SuperAdmin users.
   *
   * @param map A UserMap to be added to the existing user map.
   */
  addUserTypes(map: UserMap) {
    this.userMap = {
      ...this.userMap,
      ...map,
      ...defaultUserTypes,
    };
  }

  /**
   * This allows a user to add a single user type. I don't know if adding individual
   * users or a group is preferrable, but currently, this method just uses the
   * addUserTypes method as a shortcut.
   *
   * @param type A single usertype
   */
  addUserType(type: UserType) {
    const map: UserMap = {};
    map[type.name] = type;

    this.addUserTypes(map);
  }
}

class UserType {
  constructor(private typeName: string, private level: number) {}

  toString(): string {
    return this.name;
  }

  get name(): string {
    return this.typeName;
  }

  get accessLevel(): number {
    return this.level;
  }

  /**
   * This method accepts one UserType and determines if this UserType has a
   * sufficient access level to access whatever is required by the passed
   * UserType.
   *
   * @param level The UserType required for access.
   * @returns boolean true means that the current UserType can access this UserType
   */
  canAccessLevel(userType: UserType): boolean {
    return this.level >= userType.accessLevel;
  }
}

const defaultUserTypes: UserMap = {
  superAdmin: new UserType('superAdmin', Number.MAX_SAFE_INTEGER),
  admin: new UserType('admin', Number.MAX_SAFE_INTEGER - 1),
  editor: new UserType('editor', Math.pow(2, 32)),
  writer: new UserType('writer', Math.pow(2, 16)),
  viewer: new UserType('viewer', Math.pow(2, 4)),
};

export {
  UserType,
  UserTypeMap,
  defaultUserTypes,
};