import { typeGuards } from '@dataTypes/';

class UserToken {
  constructor(
    public username: string,
    public userId: string,
    public userType: string,
  ) {}

  static fromJson(rawObj: unknown ): UserToken {
    if ( !typeGuards.isRecord(rawObj)
      || typeof rawObj.username !== 'string'
      || typeof rawObj.userId !== 'string'
      || typeof rawObj.userType !== 'string'
    ) {
      throw new Error('Invalid Data');
    }

    const u: UserToken = {
      username: rawObj.username,
      userId: rawObj.userId,
      userType: rawObj.userType,
    };

    return u;
  }
}

export default UserToken;