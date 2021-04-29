import Router from 'koa-router';
import Koa from 'koa';
import koaJWT from "koa-jwt";
import { Next, ParameterizedContext } from 'koa';
import mount from 'koa-mount';
import { hashSync, compareSync } from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import {
  gql,
  ApolloServer,
  makeExecutableSchema,
  UserInputError,
} from 'apollo-server-koa';
import { rule, allow, shield } from 'graphql-shield';
import { applyMiddleware } from 'graphql-middleware'

import { DataController } from '@root/data-controllers';
import {
  ProgramContext,
  UserTypeMap,
  NewUser,
  User,
  UserToken,
  UserType,
  typeGuards,
} from '@dataTypes/';
// import { useRouteProtection } from './route-protection';
import {
  EmailExistsException,
  UserExistsException,
} from '@root/exceptions/user-exceptions';
import { isRecord } from '@dataTypes/type-guards';

class ActionBank {
  private dataController: DataController;
  private options: Record<string, unknown>;
  private context: ProgramContext;

  mainApp: Koa;

  userApp: Koa;

  // 15 minute timeout for password tokens
  private PASSWORD_TOKEN_TIMEOUT: number = 1000 * 60 * 15;

  constructor() {}

  async init(dataController: DataController, options?: Record<string, unknown>): Promise<ActionBank> {
    this.dataController = dataController;
    this.options = options !== undefined ? options : {};

    this.context = {
      userTypeMap: new UserTypeMap(),
    };

    await this.dataController.init(this.context);

    try {
      const isNoUsers = await this.dataController.userController.isNoUsers();
      if (isNoUsers) {
        const u: NewUser = {
          username: 'admin',
          email: 'admin@admin.admin',
          firstName: 'admin',
          lastName: 'admin',
          userType: this.context.userTypeMap.getUserType('superAdmin'),
          passwordHash: this.hashPassword('password'),
          userMeta: {},
          enabled: true,
        };

        await this.dataController.userController.addUser(u);
      }
    } catch(e) {
      console.log(`Error during init: ${e}`);
      process.exit();
    }

    this.userApp = this.initUserRouter();

    this.mainApp = new Koa();
    this.mainApp.use(mount('/user', this.userApp));

    return this;
  }

  private initUserRouter(): Koa {
    const adminUserType = this.context.userTypeMap.getUserType('admin');
    const editorUserType = this.context.userTypeMap.getUserType('editor');

    const r = new Router();
    const app = new Koa();

    r.post(
      '/login',
      async (ctx, next) => this.logUserIn(ctx, next),
    );

    r.get(
      '/id',
      this.useRouteProtection(),
      async (ctx, next) => this.filterByUserType(ctx, next, editorUserType),
      async (ctx, next) => this.getUserById(ctx, next),
    );

    r.get(
      '/username',
      this.useRouteProtection(),
      async (ctx, next) => this.filterByUserType(ctx, next, editorUserType),
      async (ctx, next) => this.getUserByUserName(ctx, next),
    );

    r.post(
      '/add',
      this.useRouteProtection(),
      async (ctx, next) => this.filterByUserType(ctx, next, adminUserType),
      async (ctx, next) => this.addUser(ctx, next),
    );

    r.post(
      '/edit',
      this.useRouteProtection(),
      async (ctx, next) => this.filterByUserType(ctx, next, adminUserType),
      async (ctx, next) => this.editUser(ctx, next),
    );

    r.post(
      '/updatePassword',
      this.useRouteProtection(),
      async (ctx, next) => this.filterByUserType(ctx, next, adminUserType),
      async (ctx, next) => this.updatePassword(ctx, next),
    );

    r.post(
      '/updatePasswordWithToken',
      async (ctx, next) => this.filterByUserType(ctx, next, adminUserType),
      async (ctx, next) => this.updatePasswordWithToken(ctx, next),
    );

    r.post(
      '/getPasswordResetToken',
      async (ctx, next) => this.filterByUserType(ctx, next, adminUserType),
      async (ctx, next) => this.getPasswordResetToken(ctx, next),
    );

    r.post(
      '/delete',
      this.useRouteProtection(),
      async (ctx, next) => this.filterByUserType(ctx, next, adminUserType),
      async (ctx, next) => this.deleteUser(ctx, next),
    );

    const typeDefs = gql`
      type Query {
        getUserById(id: ID!): User,
        getUserByUsername(username: String): User,
        getUsers(pagination: Int, page: Int): [User]
      }

      type User {
        id: ID,
        username: String,
        email: String,
        firstName: String,
        lastName: String,
        userType: String,
        userMeta: String,
        dateAdded: Int,
        dateUpdated: Int
      }
    `;


    const resolvers = {
      Query: {
        getUserById: async (parent, args, context, info) => {
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
        },
        getUsers: async (parent, args, context, info) => {
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
        },
      },
    };

    const permissions = {
      Query: {
        // test: this.guardByUserType(editorUserType),
        getUserById: this.guardByUserType(adminUserType),
        getUserByUsername: this.guardByUserType(adminUserType),
      },
    };

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    const schemaWithMiddleware = applyMiddleware(
      schema,
      shield(
        permissions,
        { allowExternalErrors: true },
      ),
    );

    const apolloServer = new ApolloServer({
      schema: schemaWithMiddleware,
      // This function passes the Koa context into the Apollo Server instnaces
      context: (config) => {
        const ctx: Record<string, unknown> = {};

        if (isRecord(config) && isRecord(config.ctx)) {
          ctx.koaCtx = config.ctx;
        }

        return ctx;
      },
      // TODO format the error?
      formatError: (err) => {
        // return null;
        return err;
      },
    });

    apolloServer.applyMiddleware({app});

    r.post('/graphql', apolloServer.getMiddleware());

    app
      .use(r.routes())
      .use(r.allowedMethods());

    return app;
  }

  /**
   * This rule guards against users whose permission levels are too low to access
   * certain resources.
   *
   * @param minUserType The minimum userType allowed to access the content
   * @returns Rule
   */
  guardByUserType(minUserType: UserType) {
    return rule()(
      (parent, args, ctx, info) => {

        if (!isRecord(ctx)
          || !isRecord(ctx.koaCtx)
          || !isRecord(ctx.koaCtx.state)
          || !isRecord(ctx.koaCtx.state.user)
        ) {
          return false;
        }

        const user = ctx.koaCtx.state.user;

        let token: UserToken;
        try {
          token = UserToken.fromJson(user);
        } catch (e) {
          return false;
        }

        const currentUserType = this.context.userTypeMap.getUserType(token.userType);

        return currentUserType.canAccessLevel(minUserType);
      },
    );
  }

  private useRouteProtection() {
    const secret = process.env.jwt_secret ?? 'default_secret';
    // console.log('route protection', secret);
    return koaJWT({secret});
  }

  private hashPassword(password: string): string {
    return hashSync(password, 12);
  }

  /**
   * This middleware is supposed to be used AFTER koa-jwt is run so that the JWT the user
   * passes is contained in ctx.state.user. This middleware determines the minimum user type
   * to perform an action and either goes to next on success or throws an error on failure.
   *
   * @param ctx koa Context object
   * @param next koa next function.
   * @param minUserType Minimum UserType to perform an action.
   */
  private async filterByUserType(ctx: ParameterizedContext, next: Next, minUserType: UserType) {
    const user = ctx?.state?.user;

    if (!typeGuards.isRecord(user)) {
      ctx.throw(401, 'Invalid User Token');
    }

    let token: UserToken;
    try {
      token = UserToken.fromJson(user);
    } catch (e) {
      ctx.throw(401, 'Invalid User Token');
    }

    const currentUserType = this.context.userTypeMap.getUserType(token.userType);

    if (!currentUserType.canAccessLevel(minUserType)) {
      ctx.throw(403, 'You lack the permissions to access this resource');
    }

    await next();
  }

  /*************************************************************************************
   * User Routes
   ********************************************************************************** */

  private async logUserIn(ctx: ParameterizedContext, next: Next) {
    const body = ctx?.request?.body;

    if (!typeGuards.isRecord(body)) {
      ctx.throw(400, 'Invalid Credentials');
    }

    if ( typeof body?.username !== 'string'
      || typeof body?.password !== 'string'
    ) {
      ctx.throw(400, 'Invalid Credentials');
    }

    let user: User;
    try {
      user = await this.dataController.userController.getUserByUsername(body.username);
    } catch(e) {
      ctx.throw(401, 'Invalid Credentials');
    }

    if (user.enabled !== true) {
      ctx.throw(401, 'Invalid Credentials');
    }

    if (!compareSync(body.password, user.passwordHash)) {
      ctx.throw(401, 'Invalid Credentials');
    }

    const secret = process.env.jwt_secret ?? 'default_secret';

    const claims: UserToken = {
      username: user.username,
      userType: user.userType.name,
      userId: user.id,
    };

    const token: string = jwt.sign(
      claims,
      secret,
      {
        algorithm: 'HS256',
        expiresIn: '12h',
      },
    );

    ctx.body = {
      token,
    };

    await next();
  }

  private async getUserById(ctx: ParameterizedContext, next: Next) {
    const id = ctx?.query?.id;

    if (typeof id !== 'string') {
      ctx.throw(400, 'Invalid Credentials');
    }

    let user: User;
    try {
      user = await this.dataController.userController.getUserById(id);
    } catch(e) {
      ctx.throw(400, 'Invalid user ID provided');
    }

    ctx.body = {
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };

    await next();
  }

  private async getUserByUserName(ctx: ParameterizedContext, next: Next) {
    const username = ctx?.query?.username;

    if (typeof username !== 'string') {
      ctx.throw(400, 'Invalid Credentials');
    }

    let user: User;

    try {
      user = await this.dataController.userController.getUserByUsername(username);

    } catch (e) {
      ctx.throw(400, 'Invalid username provided');
    }

    ctx.body = {
      msg: '/username',
    };

    ctx.body = {
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };

    await next();
  }

  private async addUser(ctx: ParameterizedContext, next: Next) {
    const body = ctx?.request?.body;

    if (!typeGuards.isRecord(body)) {
      ctx.throw(400, 'Invalid Credentials');
    }

    const newUser = body.newUser;

    if (!typeGuards.isRecord(newUser)) {
      ctx.throw(400, 'Invalid Credentials');
    }

    let u: NewUser;

    // Let's construct a new user to make sure the user inputs are correct
    try {
      // Let's hash a password first.
      if (typeof newUser?.password !== 'string') {
        throw new Error();
      }

      const password = this.hashPassword(newUser.password);

      u = NewUser.fromJson({
        ...newUser,
        password,
      }, this.context.userTypeMap);
    } catch(e) {
      ctx.throw(400, 'Invalid Credentials');
    }

    // If we get here, let's construct a regular user and hash the
    // new user's password.
    let savedUser: User;


    try {
      savedUser = await this.dataController.userController.addUser(u);
    } catch (e) {
      if (e instanceof UserExistsException) {
        ctx.throw(400, `Username already exists`);
      }

      if(e instanceof EmailExistsException) {
        ctx.throw(400, `Email already exists`);
      }

      ctx.throw(500, `Error while saving user: ${e}`);
    }

    ctx.body = {
      id: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      userType: savedUser.userType.name,
    };

    await next();
  }

  /**
   * Does not edit the user's password
   * @param ctx
   * @param next
   * @returns
   */
  private async editUser(ctx: ParameterizedContext, next: Next) {
    const body = ctx?.request?.body;

    if (!typeGuards.isRecord(body)) {
      ctx.throw(400, 'Invalid Credentials');
    }

    const user = body.user;

    if (!typeGuards.isRecord(user)) {
      ctx.throw(400, 'Invalid Credentials');
    }

    if (typeof user.id !== 'string') {
      ctx.throw(400, 'Invalid Credentials');
    }

    // We prevent a user from editing a user of a higher level. e.g. admin user types
    // cannot edit super admins.
    let currentEditedUser: User;
    try {
      currentEditedUser = await this.dataController.userController.getUserById(user.id);
    } catch(e) {
      ctx.throw(400, 'User does not exist');
    }

    const userTypeMap = this.context.userTypeMap;

    // We use filterByUserType to make sure that the userType actually exists.
    let requester: UserToken;

    try {
      requester = UserToken.fromJson(ctx?.state?.user);
    } catch(e) {
      // We're unlikely to hit this, but just in case...
      ctx.throw(400, 'Invalid JWT');
    }

    const requesterType = userTypeMap.getUserType(requester?.userType);

    // compareUserTypeLevels will compare the first userType to the second. If the first
    // is lower than the second, it will return a value less than 1.
    if (userTypeMap.compareUserTypeLevels(requesterType, currentEditedUser.userType) < 0) {
      ctx.throw(400, 'Cannot edit a user of a higher level');
    }

    // If we made it here, we're going to construct the new User object with the old
    // user data and the new user data.

    // We have to be careful with user type. We already prevent the user from updating
    // users of a higher user type. However, we also need to make sure that the user
    // type they're updating isn't higher than their current user type. The API will
    // not prevent a user from demoting themself.
    let newUserType: UserType;

    const userType = typeof user?.userType === 'string' ? user.userType : '';

    if (user?.userType == null) {
      newUserType = currentEditedUser.userType;
    } else {
      const requestedUserType = userTypeMap.getUserType(userType);

      if(userTypeMap.compareUserTypeLevels(requesterType, requestedUserType) < 0) {
        ctx.throw(400, 'Cannot set user to a higher user level than your own.');
      }

      newUserType = requestedUserType;
    }

    const username = typeGuards.isString(user.username) ? user.username : currentEditedUser.username;
    const email = typeGuards.isString(user.email) ? user.email : currentEditedUser.email;
    const firstName = typeGuards.isString(user.firstName) ? user.firstName : currentEditedUser.firstName;
    const lastName = typeGuards.isString(user.lastName) ? user.lastName : currentEditedUser.lastName;
    const userMeta = typeGuards.isRecord(user.userMeta) ? user.userMeta : currentEditedUser.userMeta;
    const enabled = typeGuards.isBoolean(user.enabled) ? user.enabled : currentEditedUser.enabled;

    const editedUser = new User(
      currentEditedUser.id,
      username,
      email,
      firstName,
      lastName,
      newUserType,
      currentEditedUser.passwordHash,
      userMeta,
      enabled,
      currentEditedUser.passwordResetToken,
      currentEditedUser.passwordResetDate,
      currentEditedUser.dateAdded,
      Date.now(),
    );

    let result: User;

    try {
      result = await this.dataController.userController.editUser(editedUser);
    } catch (e) {
      let msg = '';
      if (e instanceof EmailExistsException) {
        msg += 'Email already exists for another user.';
      } else if (e instanceof UserExistsException) {
        msg += 'Username already exists for another user.';
      } else {
        msg += `${e}`;
      }

      ctx.throw(400, msg);
    }

    ctx.body = {
      id: result.id,
      username: result.username,
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
      userType: result.userType.name,
    };

    await next();
  }

  private async updatePassword(ctx: ParameterizedContext, next: Next) {
    const body = ctx?.request?.body;

    if (!typeGuards.isRecord(body)) {
      ctx.throw(400, 'Invalid Credentials');
    }

    const reqUser = body.user;

    if (!typeGuards.isRecord(reqUser)
      || typeof reqUser?.id !== 'string'
      || typeof reqUser?.newPassword !== 'string'
      || typeof reqUser?.oldPassword !== 'string') {
      ctx.throw(400, 'Invalid Credentials');
    }

    if (!this.validatePassword(reqUser.newPassword)) {
      ctx.throw('Invalid Password. Password must be 8 characters or longer');
    }

    // We prevent a user from editing a user of a higher level. e.g. admin user types
    // cannot edit super admins.
    let user: User;
    try {
      user = await this.dataController.userController.getUserById(reqUser.id);
    } catch(e) {
      ctx.throw(400, 'User does not exist');
    }

    // We check the old password to make sure it's correct
    if (!compareSync(reqUser.oldPassword, user.passwordHash)) {
      ctx.throw(401, 'Invalid Credentials');
    }

    const userErr = this.canUpdatePassword(ctx, user);
    if (userErr.length > 0) {
      ctx.throw(400, userErr);
    }

    try {
      await this.dataController.userController.updatePassword(
        reqUser.id,
        this.hashPassword(reqUser.newPassword),
      );
    } catch (e) {
      const msg = `${e}`;

      ctx.throw(400, msg);
    }

    ctx.body = {
      message: 'Password Successfully Updated',
    };

    await next();
  }

  private canUpdatePassword(ctx: ParameterizedContext, currentEditedUser: User): string {
    const userTypeMap = this.context.userTypeMap;

    // We use filterByUserType to make sure that the userType actually exists.
    let requester: UserToken;

    try {
      requester = UserToken.fromJson(ctx?.state?.user);
    } catch(e) {
      // We're unlikely to hit this, but just in case...
      return 'Invalid JWT';
    }

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

  private async getPasswordResetToken(ctx: ParameterizedContext, next: Next) {
    const body = ctx?.request?.body;

    if (!typeGuards.isRecord(body)) {
      ctx.throw(400, 'Invalid Credentials');
    }

    const reqUser = body.user;

    if ( !typeGuards.isRecord(reqUser)
      || typeof reqUser?.id !== 'string'
      || typeof reqUser?.password !== 'string'
    ) {
      ctx.throw(400, 'Invalid Credentials');
    }

    await next();
  }

  private async updatePasswordWithToken(ctx: ParameterizedContext, next: Next) {
    const body = ctx?.request?.body;

    if (!typeGuards.isRecord(body)) {
      ctx.throw(400, 'Invalid Credentials');
    }

    const reqUser = body.user;

    if (!typeGuards.isRecord(reqUser)
      || typeof reqUser?.id !== 'string'
      || typeof reqUser?.newPassword !== 'string'
      || typeof reqUser?.passwordToken !== 'string') {
      ctx.throw(400, 'Invalid Credentials');
    }

    if (!this.validatePassword(reqUser.newPassword)) {
      ctx.throw(400, 'Invalid Password. Password must be 8 characters or longer');
    }

    // We prevent a user from editing a user of a higher level. e.g. admin user types
    // cannot edit super admins.
    let user: User;
    try {
      user = await this.dataController.userController.getUserById(reqUser.id);
    } catch(e) {
      ctx.throw(400, 'User does not exist');
    }

    if (user.passwordResetToken !== reqUser.passwordResetToken) {
      ctx.throw(400, 'Invalid password reset token');
    }

    const timeout: Date = new Date(Date.now() - this.PASSWORD_TOKEN_TIMEOUT);
    const passwordResetDate = new Date(user.passwordResetDate);

    if (passwordResetDate < timeout) {
      ctx.throw(400, 'Password reset token has expired');
    }

    const userErr = this.canUpdatePassword(ctx, user);
    if (userErr.length > 0) {
      ctx.throw(400, userErr);
    }

    try {
      await this.dataController.userController.updatePassword(
        reqUser.id,
        this.hashPassword(reqUser.newPassword),
      );
    } catch (e) {
      const msg = `${e}`;

      ctx.throw(400, msg);
    }

    ctx.body = {
      message: 'Password Successfully Updated',
    };

    await next();
  }

  private async deleteUser(ctx: ParameterizedContext, next: Next) {
    const body = ctx?.request?.body;

    if (!typeGuards.isRecord(body)) {
      ctx.throw(400, 'Invalid Credentials');
    }

    const reqUser = body.user;

    if (!typeGuards.isRecord(reqUser)
      || typeof reqUser?.id !== 'string'
    ) {
      ctx.throw(400, 'Invalid Credentials');
    }

    // We prevent our user from deleting themself.
    let requester: UserToken;
    try {
      requester = UserToken.fromJson(ctx?.state?.user);
    } catch(e) {
      ctx.throw(401, 'Invalid User Data');
    }

    if (requester.userId === reqUser.id) {
      ctx.throw(400, 'You cannot delete yourself');
    }

    // We prevent a user from deleting a user of a higher level. e.g. admin user types
    // cannot delete super admins.
    let deletedUser: User;
    try {
      deletedUser = await this.dataController.userController.getUserById(reqUser.id);
    } catch(e) {
      ctx.throw(400, 'User does not exist');
    }

    // There should be no problem here. We use filterByUserType to make sure that the
    // userType actually exists.
    const requesterType = this.context.userTypeMap.getUserType(requester?.userType);

    // compareUserTypeLevels will compare the first userType to the second. If the first
    // is lower than the second, it will return a value less than 1.
    if (this.context.userTypeMap.compareUserTypeLevels(requesterType, deletedUser.userType) < 0) {
      ctx.throw(400, 'Cannot delete a user of a higher level');
    }

    try {
      await this.dataController.userController.deleteUser(reqUser.id);
    } catch(e) {
      ctx.throw(400, 'User does not exist');
    }

    ctx.body = {
      msg: `user id ${reqUser.id} deleted`,
    };

    await next();
  }

  /*************************************************************************************
   * Deposit Routes
   ********************************************************************************** */

  /*************************************************************************************
   * Withdrawal Routes
   ********************************************************************************** */


}

export default ActionBank;