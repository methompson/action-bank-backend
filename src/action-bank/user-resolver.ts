import { hashSync, compareSync } from 'bcryptjs';
import {
  UserInputError,
  AuthenticationError,
} from 'apollo-server-koa';

import { DataController } from '@root/data-controllers';
import {
  ProgramContext,
  NewUser,
  User,
  UserToken,
} from '@dataTypes';
import {
  EmailExistsException,
  UserExistsException,
} from '@root/exceptions/user-exceptions';
import { isRecord } from '@dataTypes/type-guards';
import {
  MutateDataException,
} from '@root/exceptions/graphql-exceptions';
import CommonResolver from './common-resolver';

class UserResolver extends CommonResolver {
  constructor(
    protected dataController: DataController,
    protected context: ProgramContext,
  ) {
    super();
  }

  async getUserById(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args?.id !== 'string'
    ) {
      // throw new UserInputError('Invalid args value');
      return null;
    }

    let user: User;
    try {
      user = await this.dataController.userController.getUserById(args.id);
    } catch(e) {
      // throw new Error(`Data controller error: ${e}`);
      return null;
    }

    return user.graphQLObject;
  }

  async getUserByUsername(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args?.username !== 'string'
    ) {
      // throw new UserInputError('Invalid args value');
      return null;
    }

    let user: User;
    try {
      user = await this.dataController.userController.getUserByUsername(args.username);
    } catch(e) {
      // throw new Error(`Data controller error: ${e}`);
      return null;
    }

    return user.graphQLObject;
  }

  async getUsers(parent, args, ctx, info) {
    if (!isRecord(args)) {
      return null;
    }

    const pagination = typeof args?.pagination === 'number'
      ? args.pagination
      : 10;

    const page = typeof args?.page === 'number'
      ? args.page
      : 1;

    const users = await this.dataController.userController.getUsers(pagination, page);

    const output = users.map((el) => el.graphQLObject);

    return output;
  }

  async addUser(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args?.password !== 'string'
    ) {
      return null;
    }

    let nUser: NewUser;
    try {
      const password = this.hashPassword(args?.password);
      nUser = NewUser.fromJson({
        ...args,
        password,
      }, this.context.userTypeMap);
    } catch(e) {
      throw new UserInputError('Invalid Data Provided', {
        argumentName: 'userData'
      });
    }

    let savedUser: User;

    try {
      savedUser = await this.dataController.userController.addUser(nUser);
    } catch(e) {
      if (e instanceof UserExistsException) {
        throw new MutateDataException('Username already exists');
      }

      if(e instanceof EmailExistsException) {
        throw new MutateDataException('Email already exists');
      }

      throw new MutateDataException(`Error while saving user: ${e}`);
    }

    return savedUser.graphQLObject;
  }

  async editUser(parent, args, ctx, info) {
    if (!isRecord(args) || typeof args?.id !== 'string') {
      return null;
    }

    if (!isRecord(ctx)
      || !isRecord(ctx.koaCtx)
      || !isRecord(ctx.koaCtx.state)
      || !isRecord(ctx.koaCtx.state.user)
    ) {
      throw new MutateDataException('Invalid Context State Data');
    }

    let requestingUser: UserToken;

    try {
      requestingUser = UserToken.fromJson(ctx.koaCtx.state.user);
    } catch(e) {
      throw new MutateDataException('Invalid User Data');
    }

    if (requestingUser.userId !== args.id) {
      throw new AuthenticationError('You can only update your own User information');
    }

    let currentUserState: User;
    try {
      currentUserState = await this.dataController.userController.getUserById(args.id);
    } catch(e) {
      throw new MutateDataException('Invalid ID Provided');
    }

    const editUserState = currentUserState.mergeEdits(args, this.context.userTypeMap);

    let result: User;
    try {
      result = await this.dataController.userController.editUser(editUserState);
    } catch (e) {
      let msg = '';
      if (e instanceof EmailExistsException) {
        msg += 'Email already exists for another user.';
      } else if (e instanceof UserExistsException) {
        msg += 'Username already exists for another user.';
      } else {
        msg += `${e}`;
      }

      throw new MutateDataException(msg);
    }

    return result.graphQLObject;
  }

  async adminEditUser(parent, args, ctx, info) {
    if (!isRecord(args) || typeof args?.id !== 'string') {
      return null;
    }

    if (!isRecord(ctx)
      || !isRecord(ctx.koaCtx)
      || !isRecord(ctx.koaCtx.state)
      || !isRecord(ctx.koaCtx.state.user)
    ) {
      throw new MutateDataException('Invalid User Data');
    }

    let requestingUser: UserToken;

    try {
      requestingUser = UserToken.fromJson(ctx.koaCtx.state.user);
    } catch(e) {
      throw new MutateDataException('Invalid Login Data');
    }

    const userTypeMap = this.context.userTypeMap;

    // We need to check two things:
    // The user isn't updating a higher rank user
    // The user is promoting someone else to a higher rank than their own.
    const requestingUserType = userTypeMap.getUserType(requestingUser.userType);

    // Here we check if a user is updating another user to a higher level than their
    // own user type.
    if (typeof args.userType === 'string') {
      const updatedUserType = userTypeMap.getUserType(args.userType);
      if (userTypeMap.compareUserTypeLevels(requestingUserType, updatedUserType) < 0) {
        throw new MutateDataException('Cannot update a user to a higher level than your own');
      }
    }

    // We get the current user.
    let currentUserState: User;
    try {
      currentUserState = await this.dataController.userController.getUserById(args.id);
    } catch(e) {
      throw new MutateDataException('Invalid ID Provided');
    }

    // Here we check if a user is updating another user of a higher level than their
    // own user type.
    if (userTypeMap.compareUserTypeLevels(requestingUserType, currentUserState.userType) < 0) {
      throw new MutateDataException('Cannot update a user of a higher level than your own');
    }

    const userData = { ...args };

    if (typeof args.password === 'string' && this.validatePassword(args.password)) {
      userData.passwordHash = this.hashPassword(args.password);
    }

    const editUserState = currentUserState.mergeEdits(userData, userTypeMap);

    let result: User;
    try {
      result = await this.dataController.userController.editUser(editUserState);
    } catch (e) {
      let msg = '';
      if (e instanceof EmailExistsException) {
        msg += 'Email already exists for another user.';
      } else if (e instanceof UserExistsException) {
        msg += 'Username already exists for another user.';
      } else {
        msg += `${e}`;
      }

      throw new MutateDataException(msg);
    }

    return result.graphQLObject;
  }

  async updatePassword(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args?.id !== 'string'
      || typeof args?.newPassword !== 'string'
      || typeof args?.oldPassword !== 'string'
      || !isRecord(ctx)
      || !isRecord(ctx.koaCtx)
      || !isRecord(ctx.koaCtx.state)
      || !isRecord(ctx.koaCtx.state.user)
    ) {
      throw new MutateDataException('Invalid Input');
    }

    if (!this.validatePassword(args.newPassword)) {
      throw new MutateDataException('Invalid Password. Password must be 8 characters or longer');
    }

    // We prevent a user from editing a user of a higher level. e.g. admin user types
    // cannot edit super admins.
    let user: User;
    try {
      user = await this.dataController.userController.getUserById(args.id);
    } catch(e) {
      throw new MutateDataException('User does not exist');
    }

    // We check the old password to make sure it's correct
    if (!compareSync(args.oldPassword, user.passwordHash)) {
      throw new MutateDataException('Invalid User Password');
    }

    let requestingUser: UserToken;

    try {
      requestingUser = UserToken.fromJson(ctx.koaCtx.state.user);
    } catch(e) {
      throw new MutateDataException('Invalid Login Data');
    }

    const userErr = this.canUpdatePassword(requestingUser, user);
    if (userErr.length > 0) {
      throw new MutateDataException('Cannot update password');
    }

    try {
      await this.dataController.userController.updatePassword(
        user.id,
        this.hashPassword(args.newPassword),
      );
    } catch (e) {
      const msg = `${e}`;

      throw new MutateDataException(msg);
    }

    return args.id;
  }

  async deleteUser(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args?.id !== 'string'
      || !isRecord(ctx)
      || !isRecord(ctx.koaCtx)
      || !isRecord(ctx.koaCtx.state)
      || !isRecord(ctx.koaCtx.state.user)
    ) {
      throw new MutateDataException('Invalid User Data');
    }

    const delUserId = args.id;
    let requestingUser: UserToken;

    try {
      requestingUser = UserToken.fromJson(ctx.koaCtx.state.user);
    } catch(e) {
      throw new MutateDataException('Invalid Login Data');
    }

    // We prevent our user from deleting themself.
    if (requestingUser.userId === delUserId) {
      throw new MutateDataException('You cannot delete yourself');
    }

    // We prevent a user from deleting a user of a higher level. e.g. admin user types
    // cannot delete super admins.
    let deletedUser: User;
    try {
      deletedUser = await this.dataController.userController.getUserById(delUserId);
    } catch(e) {
      throw new MutateDataException('User does not exist');
    }

    // There should be no problem here. We use filterByUserType to make sure that the
    // userType actually exists.
    const requesterType = this.context.userTypeMap.getUserType(requestingUser?.userType);

    // compareUserTypeLevels will compare the first userType to the second. If the first
    // is lower than the second, it will return a value less than 1.
    if (this.context.userTypeMap.compareUserTypeLevels(requesterType, deletedUser.userType) < 0) {
      throw new MutateDataException('Cannot delete a user of a higher level');
    }

    try {
      await this.dataController.userController.deleteUser(delUserId);
    } catch(e) {
      throw new MutateDataException('User does not exist');
    }

    return delUserId;
  }

  async getPasswordResetToken() {
  // private async getPasswordResetToken(ctx: ParameterizedContext, next: Next) {
  //   const body = ctx?.request?.body;

  //   if (!isRecord(body)) {
  //     ctx.throw(400, 'Invalid Credentials');
  //   }

  //   const reqUser = body.user;

  //   if ( !isRecord(reqUser)
  //     || typeof reqUser?.id !== 'string'
  //     || typeof reqUser?.password !== 'string'
  //   ) {
  //     ctx.throw(400, 'Invalid Credentials');
  //   }

  //   await next();
  }

  async updatePasswordWithToken() {
  // private async updatePasswordWithToken(ctx: ParameterizedContext, next: Next) {
    // const body = ctx?.request?.body;

    // if (!isRecord(body)) {
    //   ctx.throw(400, 'Invalid Credentials');
    // }

    // const reqUser = body.user;

    // if (!isRecord(reqUser)
    //   || typeof reqUser?.id !== 'string'
    //   || typeof reqUser?.newPassword !== 'string'
    //   || typeof reqUser?.passwordToken !== 'string') {
    //   ctx.throw(400, 'Invalid Credentials');
    // }

    // if (!this.validatePassword(reqUser.newPassword)) {
    //   ctx.throw(400, 'Invalid Password. Password must be 8 characters or longer');
    // }

    // // We prevent a user from editing a user of a higher level. e.g. admin user types
    // // cannot edit super admins.
    // let user: User;
    // try {
    //   user = await this.dataController.userController.getUserById(reqUser.id);
    // } catch(e) {
    //   ctx.throw(400, 'User does not exist');
    // }

    // if (user.passwordResetToken !== reqUser.passwordResetToken) {
    //   ctx.throw(400, 'Invalid password reset token');
    // }

    // const timeout: Date = new Date(Date.now() - this.PASSWORD_TOKEN_TIMEOUT);
    // const passwordResetDate = new Date(user.passwordResetDate);

    // if (passwordResetDate < timeout) {
    //   ctx.throw(400, 'Password reset token has expired');
    // }

    // const userErr = this.canUpdatePassword(ctx, user);
    // if (userErr.length > 0) {
    //   ctx.throw(400, userErr);
    // }

    // try {
    //   await this.dataController.userController.updatePassword(
    //     reqUser.id,
    //     this.hashPassword(reqUser.newPassword),
    //   );
    // } catch (e) {
    //   const msg = `${e}`;

    //   ctx.throw(400, msg);
    // }

    // ctx.body = {
    //   message: 'Password Successfully Updated',
    // };

    // await next();
  }

  hashPassword(password: string): string {
    return hashSync(password, 12);
  }

  private canUpdatePassword(requester: UserToken, currentEditedUser: User): string {
    const userTypeMap = this.context.userTypeMap;

    const requesterType = userTypeMap.getUserType(requester?.userType);

    // compareUserTypeLevels will compare the first userType to the second. If the first
    // is lower than the second, it will return a value less than 1.
    if (userTypeMap.compareUserTypeLevels(requesterType, currentEditedUser.userType) < 0) {
      return 'Cannot edit a user of a higher level';
    }

    return '';
  }

  /**
   * Used to validate whether a password is correct. Any rules that you want
   * to apply to a password should be here
   *
   * @param newPassword string
   * @returns boolean
   */
   private validatePassword(newPassword: string): boolean {
    return newPassword.length >= 8;
  }
}

export default UserResolver;