import Router from 'koa-router';
import Koa from 'koa';
import { Next, ParameterizedContext } from 'koa';
import mount from 'koa-mount';
import { hashSync, compareSync } from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import {
  gql,
  ApolloServer,
  makeExecutableSchema,
  UserInputError,
  AuthenticationError,
} from 'apollo-server-koa';
import { Rule } from 'graphql-shield/dist/rules';
import { rule, shield } from 'graphql-shield';
import { applyMiddleware } from 'graphql-middleware';

import { DataController } from '@root/data-controllers';
import {
  ProgramContext,
  UserTypeMap,
  NewUser,
  User,
  UserToken,
  UserType,
  ActionBankOptions,
} from '@dataTypes';
// import { useRouteProtection } from './route-protection';
import {
  EmailExistsException,
  UserExistsException,
} from '@root/exceptions/user-exceptions';
import { isActionBankOptions, isRecord } from '@dataTypes/type-guards';
import {
  MutateDataException,
  QueryDataException,
} from '@root/exceptions/graphql-exceptions';

class ActionBank {
  private dataController: DataController;
  private options: Record<string, unknown>;
  private context: ProgramContext;

  mainApp: Koa;

  userApp: Koa;
  actionApp: Koa;

  // 15 minute timeout for password tokens
  private PASSWORD_TOKEN_TIMEOUT: number = 1000 * 60 * 15;

  constructor() {}

  async init(dataController: DataController, options?: ActionBankOptions | Record<string, unknown>): Promise<ActionBank> {
    this.dataController = dataController;
    if (isActionBankOptions(options)) {
      this.options = {
        ...options
       };
    } else {
      throw new Error('Invalid Action Bank Options');
    }

    this.context = {
      userTypeMap: new UserTypeMap(),
    };

    try {
      const userController = this.dataController.userController;

      if (userController === null) {
        throw new Error('Invalid UserController');
      }

      const isNoUsers = await userController.isNoUsers();

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

        await userController.addUser(u);
      }
    } catch(e) {
      const msg = `Error during init: ${e}`;
      console.log(msg);

      throw msg;
    }

    this.userApp = this.initUserRouter();
    this.actionApp = this.initBankRouter();

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

    const typeDefs = gql`
      type Query {
        getUserById(id: ID!): User,
        getUserByUsername(username: String!): User,
        getUsers(pagination: Int, page: Int): [User]
      }

      type Mutation {
        addUser(username: String!, email: String!, password: String!, enabled: Boolean, userMeta: String, firstName: String, lastName: String, userType: String): User
        editUser(id: ID!, username: String, email: String, userMeta: String, firstName: String, lastName: String): User
        adminEditUser(id: ID!, username: String, email: String, enabled: Boolean, userType: String, userMeta: String, firstName: String, lastName: String): User
        updatePassword(id: ID!, newPassword: String!, oldPassword: String!): ID
        deleteUser(id: ID!): ID
      }

      type User {
        id: ID,
        username: String,
        email: String,
        firstName: String,
        lastName: String,
        userType: String,
        userMeta: String,
        password: String,
        dateAdded: Int,
        dateUpdated: Int
      }
    `;

    const resolvers = {
      Query: {
        getUserById: async (parent, args, ctx, info) => {
          return this.getUserById(parent, args, ctx, info);
        },
        getUserByUsername: async (parent, args, ctx, info) => {
          return this.getUserByUsername(parent, args, ctx, info);
        },
        getUsers: async (parent, args, ctx, info) => {
          return this.getUsers(parent, args, ctx, info);
        },
      },
      Mutation: {
        addUser: async (parent, args, ctx, info) => {
          return this.addUser(parent, args, ctx, info);
        },
        editUser: async(parent, args, ctx, info) => {
          return this.editUser(parent, args, ctx, info);
        },
        // Functions the same as editUser, but can only be run by admin users and allows
        // the user to modify other users and more fields.
        adminEditUser: async(parent, args, ctx, info) => {
          return this.adminEditUser(parent, args, ctx, info);
        },
        updatePassword: async(parent, args, ctx, info) => {
          return this.updatePassword(parent, args, ctx, info);
        },
        deleteUser: async(parent, args, ctx, info) => {
          return this.deleteUser(parent, args, ctx, info);
        },
      },
    };

    const permissions = {
      Query: {
        // test: this.guardByUserType(editorUserType),
        getUserById: this.guardByUserType(adminUserType),
        getUserByUsername: this.guardByUserType(adminUserType),
        getUsers: this.guardByUserType(adminUserType),
      },
      Mutation: {
        adminEditUser: this.guardByUserType(adminUserType),
        updatePassword: this.guardByRequestingUser(),
        deleteUser: this.guardByUserType(adminUserType),
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

  private initBankRouter(): Koa {
    const adminUserType = this.context.userTypeMap.getUserType('admin');
    const editorUserType = this.context.userTypeMap.getUserType('editor');

    const r = new Router();
    const app = new Koa();

    const typeDefs = gql`
      type Query {
        getDeposits(userId: ID!): [Deposit]
        getWithdrawals(userId: ID!): [Withdrawal]
        getDepositActions(userId: ID!): [DepositAction]
        getWithdrawalActions(userId: ID!): [WithdrawalAction]
        getExchanges(userId: ID!): [Exchange]
      }

      type Mutation {
        addDeposit(depositActionId: ID!, quantity: Float!): Deposit
        addWithdrawal(withdrawalActionId: ID!, quantity: Float!): Withdrawal
        editDeposit(depositId: ID!, quantity: Float!): Deposit
        editWithdrawal(withdrawalId: ID!, quantity: Float!): Deposit
        deleteDeposit(depositId: ID!): ID
        deleteWithdrawal(withdrawalId: ID!): ID
      }

      type Exchange {
        id: ID,
        depositActions: [DepositAction],
        deposits: [Deposit],
        withdrawalActions: [WithdrawalAction],
        withdrawals: [Withdrawal],
        totalCurrent: Float,
      }

      type Deposit {
        id: ID,
        depositActionId: ID,
        depositActionName: String,
        uomQuant: Int,
        depositQuant: Int,
        quant: Float,
        dateAdded: Int,
      }

      type DepositAction {
        id: ID,
        name: String,
        uom: String,
        uomQuant: Int,
        depositQuant: Int,
        enabled: Boolean,
        sortedLocation: Int,
        dateAdded: Int,
        dateUpdated: Int,
      }

      type Withdrawal {
        id: ID,
        withdrawalActionId: ID,
        withdrawalActionName: String,
        uomQuant: Int,
        withdrawalQuant: Int,
        quant: Float,
        dateAdded: Int,
      }

      type WithdrawalAction {
        id: ID,
        name: String,
        uom: String,
        uomQuant: Int,
        withdrawalQuant: Int,
        enabled: Boolean,
        sortedLocation: Int,
        dateAdded: Int,
        dateUpdated: Int,
      }
    `;

    const resolvers = {
      Query: {
        getDeposits: async (parent, args, ctx, info) => {
          throw new QueryDataException('Unimplemented Resolver');
        },
        getWithdrawals: async (parent, args, ctx, info) => {
          throw new QueryDataException('Unimplemented Resolver');
        },
        getDepositActions: async (parent, args, ctx, info) => {
          throw new QueryDataException('Unimplemented Resolver');
        },
        getWithdrawalActions: async (parent, args, ctx, info) => {
          throw new QueryDataException('Unimplemented Resolver');
        },
        getExchanges: async (parent, args, ctx, info) => {
          throw new QueryDataException('Unimplemented Resolver');
        },
      },
      Mutation: {
        addDeposit: async (parent, args, ctx, info) => {
          throw new MutateDataException('Unimplemented Resolver');
        },
        addWithdrawal: async (parent, args, ctx, info) => {
          throw new MutateDataException('Unimplemented Resolver');
        },
        editDeposit: async (parent, args, ctx, info) => {
          throw new MutateDataException('Unimplemented Resolver');
        },
        editWithdrawal: async (parent, args, ctx, info) => {
          throw new MutateDataException('Unimplemented Resolver');
        },
        deleteDeposit: async (parent, args, ctx, info) => {
          throw new MutateDataException('Unimplemented Resolver');
        },
        deleteWithdrawal: async (parent, args, ctx, info) => {
          throw new MutateDataException('Unimplemented Resolver');
        },
      },
    };

    const permissions = {
      Query: {
        getDeposits: this.guardByLoggedInUser(),
        getWithdrawals: this.guardByLoggedInUser(),
        getDepositActions: this.guardByLoggedInUser(),
        getWithdrawalActions: this.guardByLoggedInUser(),
        getExchanges: this.guardByLoggedInUser(),
      },
      Mutation: {
        addDeposit: this.guardByLoggedInUser(),
        addWithdrawal: this.guardByLoggedInUser(),
        editDeposit: this.guardByLoggedInUser(),
        editWithdrawal: this.guardByLoggedInUser(),
        deleteDeposit: this.guardByLoggedInUser(),
        deleteWithdrawal: this.guardByLoggedInUser(),
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
  guardByUserType(minUserType: UserType): Rule {
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

  /**
   * This guard allows the specified user type to access the route, or if the requesting
   * user's ID matches the id in the query.
   * This guard requires that the GraphQL mutation has the user's id specified as 'id' or
   * 'userId'.
   * @param minUserType UserType The minimum usertype to allow unconditionally.
   * @returns Rule
   */
  guardByRequestingUser(): Rule {
    return rule()(
      (parent, args, ctx, info) => {

        if (!isRecord(ctx)
          || !isRecord(ctx.koaCtx)
          || !isRecord(ctx.koaCtx.state)
          || !isRecord(ctx.koaCtx.state.user)
          || !isRecord(args)
        ) {
          return false;
        }

        // if userId is null, it falls back to id.
        const userId = args.userId ?? args.id;

        const user = ctx.koaCtx.state.user;

        let token: UserToken;
        try {
          token = UserToken.fromJson(user);
        } catch (e) {
          return false;
        }

        const currentUserType = this.context.userTypeMap.getUserType(token.userType);

        return token.userId === args.id;
      },
    );
  }

  guardByLoggedInUser(): Rule {
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

        return true;
      },
    );
  }

  private hashPassword(password: string): string {
    return hashSync(password, 12);
  }

  /*************************************************************************************
   * User Functions
   ********************************************************************************** */

  private async logUserIn(ctx: ParameterizedContext, next: Next) {
    const body = ctx?.request?.body;

    if (!isRecord(body)) {
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

  private async getUserByUsername(parent, args, ctx, info) {
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

  private async getUsers(parent, args, ctx, info) {
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

  private async addUser(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args?.password != 'string'
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

  private async editUser(parent, args, ctx, info) {
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

  private async adminEditUser(parent, args, ctx, info) {
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

  private async updatePassword(parent, args, ctx, info) {
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

  private async getPasswordResetToken(ctx: ParameterizedContext, next: Next) {
    const body = ctx?.request?.body;

    if (!isRecord(body)) {
      ctx.throw(400, 'Invalid Credentials');
    }

    const reqUser = body.user;

    if ( !isRecord(reqUser)
      || typeof reqUser?.id !== 'string'
      || typeof reqUser?.password !== 'string'
    ) {
      ctx.throw(400, 'Invalid Credentials');
    }

    await next();
  }

  private async updatePasswordWithToken(ctx: ParameterizedContext, next: Next) {
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

  private async deleteUser(parent, args, ctx, info) {
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

  /*************************************************************************************
   * Deposit Routes
   ********************************************************************************** */

  /*************************************************************************************
   * Withdrawal Routes
   ********************************************************************************** */


}

export default ActionBank;