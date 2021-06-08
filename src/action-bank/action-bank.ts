import Router from 'koa-router';
import Koa from 'koa';
import { Next, ParameterizedContext } from 'koa';
import mount from 'koa-mount';
import { compareSync } from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import {
  gql,
  ApolloServer,
  makeExecutableSchema,
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
import { isActionBankOptions, isRecord } from '@dataTypes/type-guards';

import UserResolver from './user-resolver';
import ExchangeResolver from './exchange-resolver';
import DepositActionResolver from './deposit-action-resolver';
import WithdrawalActionResolver from './withdrawal-action-resolver';
import DepositResolver from './deposit-resolver';
import WithdrawalResolver from './withdrawal-resolver';

class ActionBank {
  private dataController: DataController;
  private options: Record<string, unknown>;
  private context: ProgramContext;

  mainApp: Koa;

  userApp: Koa;
  actionApp: Koa;

  // 15 minute timeout for password tokens
  private PASSWORD_TOKEN_TIMEOUT: number = 1000 * 60 * 15;

  private userResolver: UserResolver;
  private exchangeResolver: ExchangeResolver;
  private depositResolver: DepositResolver;
  private withdrawalResolver: WithdrawalResolver;
  private depositActionResolver: DepositActionResolver;
  private withdrawalActionResolver: WithdrawalActionResolver;

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

    this.userResolver = new UserResolver(dataController, this.context);
    this.exchangeResolver = new ExchangeResolver(dataController);
    this.depositActionResolver = new DepositActionResolver(dataController);
    this.withdrawalActionResolver = new WithdrawalActionResolver(dataController);
    this.depositResolver = new DepositResolver(dataController);
    this.withdrawalResolver = new WithdrawalResolver(dataController);

    try {
      const userController = this.dataController.userController;

      if (userController === null) {
        throw new Error('Invalid UserController');
      }

      const isNoUsers = await userController.isNoUsers();

      if (isNoUsers) {
        const u = NewUser.fromJson({
          username: 'admin',
          email: 'admin@admin.admin',
          firstName: 'admin',
          lastName: 'admin',
          userType: this.context.userTypeMap.getUserType('superAdmin').toString(),
          password: this.userResolver.hashPassword('password'),
          userMeta: {},
          enabled: true,
        }, this.context.userTypeMap);

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
    this.mainApp.use(mount('/bank', this.actionApp));

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

    const userResolver = this.userResolver;

    // We use arrow functions to maintain proper scoping when calling the
    // functions from the user resolver.
    const resolvers = {
      Query: {
        getUserById: (parent, args, ctx, info) => userResolver.getUserById(parent, args, ctx, info),
        getUserByUsername: (parent, args, ctx, info) => userResolver.getUserByUsername(parent, args, ctx, info),
        getUsers: (parent, args, ctx, info) => userResolver.getUsers(parent, args, ctx, info),
      },
      Mutation: {
        addUser: (parent, args, ctx, info) => userResolver.addUser(parent, args, ctx, info),
        editUser: (parent, args, ctx, info) => userResolver.editUser(parent, args, ctx, info),
        // Functions the same as editUser, but can only be run by admin users and allows
        // the user to modify other users and more fields.
        adminEditUser: (parent, args, ctx, info) => userResolver.adminEditUser(parent, args, ctx, info),
        updatePassword: (parent, args, ctx, info) => userResolver.updatePassword(parent, args, ctx, info),
        deleteUser: (parent, args, ctx, info) => userResolver.deleteUser(parent, args, ctx, info),
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
    const r = new Router();
    const app = new Koa();

    const typeDefs = gql`
      type Query {
        getExchangeById(exchangeId: ID!): Exchange
        getExchangesByUserId(userId: ID!): [Exchange]

        getDepositActionById(depositActionId: ID!): DepositAction
        getDepositActionsByUserId(userId: ID!): [DepositAction]

        getWithdrawalActionById(withdrawalActionId: ID!): WithdrawalAction
        getWithdrawalActionsByUserId(userId: ID!): [WithdrawalAction]

        getDepositById(depositId: ID!): Deposit
        getDepositsByUserId(userId: ID!): [Deposit]
        getDepositsByDepositActionId(depositActionId: ID!): [Deposit]

        getWithdrawalById(withdrawalId: ID!): Withdrawal
        getWithdrawalsByUserId(userId: ID!): [Withdrawal]
        getWithdrawalsByWithdrawalActionId(withdrawalActionId: ID!): [Withdrawal]
      }

      type Mutation {
        addExchange(name: String!, description: String): Exchange
        editExchange(exchangeId: ID!, name: String!, description: String): Exchange
        deleteExchange(exchangeId: ID!): ID

        addDepositAction(
          name: String!,
          exchangeId: String!,
          uom: String!,
          uomQuantity: Int!,
          depositQuantity: Int!,
          enabled: Boolean,
        ): DepositAction
        editDepositAction(
          depositActionId: ID!,
          exchangeId: String,
          name: String,
          uom: String,
          uomQuantity: Int,
          depositQuantity: Int,
          enabled: Boolean,
        ): DepositAction
        deleteDepositAction(depositActionId: ID!): ID

        addWithdrawalAction(
          name: String!,
          exchangeId: String!,
          uom: String!,
          uomQuantity: Int!,
          withdrawalQuantity: Int!,
          enabled: Boolean,
        ): WithdrawalAction
        editWithdrawalAction(
          withdrawalActionId: ID!,
          exchangeId: String,
          name: String,
          uom: String,
          uomQuantity: Int,
          withdrawalQuantity: Int,
          enabled: Boolean,
        ): WithdrawalAction
        deleteWithdrawalAction(withdrawalActionId: ID!): ID

        addDeposit(depositActionId: ID!, quantity: Float!): Deposit
        editDeposit(depositId: ID!, quantity: Float!): Deposit
        deleteDeposit(depositId: ID!): ID

        addWithdrawal(withdrawalActionId: ID!, quantity: Float!): Withdrawal
        editWithdrawal(withdrawalId: ID!, quantity: Float!): Deposit
        deleteWithdrawal(withdrawalId: ID!): ID
      }

      type Exchange {
        id: ID,
        userId: String,
        name: String,
        description: String,
        depositActions: [DepositAction],
        deposits: [Deposit],
        withdrawalActions: [WithdrawalAction],
        withdrawals: [Withdrawal],
        totalCurrency: Float,
      }

      type Deposit {
        id: ID,
        depositActionId: ID,
        depositActionName: String,
        uomQuantity: Int,
        depositQuantity: Int,
        quantity: Float,
        dateAdded: Float,
      }

      type DepositAction {
        id: ID,
        userId: ID,
        exchangeId: ID,
        name: String,
        uom: String,
        uomQuantity: Int,
        depositQuantity: Int,
        enabled: Boolean,
        sortedLocation: Int,
        dateAdded: Float,
        dateUpdated: Float,
      }

      type Withdrawal {
        id: ID,
        withdrawalActionId: ID,
        withdrawalActionName: String,
        uomQuantity: Int,
        withdrawalQuantity: Int,
        quantity: Float,
        dateAdded: Float,
      }

      type WithdrawalAction {
        id: ID,
        userId: ID,
        exchangeId: ID,
        name: String,
        uom: String,
        uomQuantity: Int,
        withdrawalQuantity: Int,
        enabled: Boolean,
        sortedLocation: Int,
        dateAdded: Float,
        dateUpdated: Float,
      }
    `;

    const exchangeResolver = this.exchangeResolver;
    const depositActionResolver = this.depositActionResolver;
    const withdrawalActionResolver = this.withdrawalActionResolver;
    const depositResolver = this.depositResolver;
    const withdrawalResolver = this.withdrawalResolver;

    const resolvers = {
      Query: {
        getExchangeById: (parent, args, ctx, info) => exchangeResolver.getExchangeById(parent, args, ctx, info),
        getExchangesByUserId: (parent, args, ctx, info) => exchangeResolver.getExchangesByUserId(parent, args, ctx, info),

        getDepositActionById: (parent, args, ctx, info) => depositActionResolver.getDepositActionById(parent, args, ctx, info),
        getDepositActionsByUserId: (parent, args, ctx, info) => depositActionResolver.getDepositActionsByUserId(parent, args, ctx, info),

        getWithdrawalActionById: (parent, args, ctx, info) => withdrawalActionResolver.getWithdrawalActionById(parent, args, ctx, info),
        getWithdrawalActionsByUserId: (parent, args, ctx, info) => withdrawalActionResolver.getWithdrawalActionsByUserId(parent, args, ctx, info),

        getDepositById: (parent, args, ctx, info) => depositResolver.getDepositById(parent, args, ctx, info),
        getDepositsByUserId: (parent, args, ctx, info) => depositResolver.getDepositsByUserId(parent, args, ctx, info),
        getDepositsByDepositActionId: (parent, args, ctx, info) => depositResolver.getDepositsByDepositActionId(parent, args, ctx, info),

        getWithdrawalById: (parent, args, ctx, info) => withdrawalResolver.getWithdrawalById(parent, args, ctx, info),
        getWithdrawalsByUserId: (parent, args, ctx, info) => withdrawalResolver.getWithdrawalsByUserId(parent, args, ctx, info),
        getWithdrawalsByWithdrawalActionId: (parent, args, ctx, info) => withdrawalResolver.getWithdrawalsByWithdrawalActionId(parent, args, ctx, info),
      },
      Mutation: {
        addExchange: (parent, args, ctx, info) => exchangeResolver.addExchange(parent, args, ctx, info),
        editExchange: (parent, args, ctx, info) => exchangeResolver.editExchange(parent, args, ctx, info),
        deleteExchange: (parent, args, ctx, info) => exchangeResolver.deleteExchange(parent, args, ctx, info),

        addDepositAction: (parent, args, ctx, info) => depositActionResolver.addDepositAction(parent, args, ctx, info),
        editDepositAction: (parent, args, ctx, info) => depositActionResolver.editDepositAction(parent, args, ctx, info),
        deleteDepositAction: (parent, args, ctx, info) => depositActionResolver.deleteDepositAction(parent, args, ctx, info),

        addWithdrawalAction: (parent, args, ctx, info) => withdrawalActionResolver.addWithdrawalAction(parent, args, ctx, info),
        editWithdrawalAction: (parent, args, ctx, info) => withdrawalActionResolver.editWithdrawalAction(parent, args, ctx, info),
        deleteWithdrawalAction: (parent, args, ctx, info) => withdrawalActionResolver.deleteWithdrawalAction(parent, args, ctx, info),

        addDeposit: (parent, args, ctx, info) => depositResolver.addDeposit(parent, args, ctx, info),
        editDeposit: (parent, args, ctx, info) => depositResolver.editDeposit(parent, args, ctx, info),
        deleteDeposit: (parent, args, ctx, info) => depositResolver.deleteDeposit(parent, args, ctx, info),

        addWithdrawal: (parent, args, ctx, info) => withdrawalResolver.addWithdrawal(parent, args, ctx, info),
        editWithdrawal: (parent, args, ctx, info) => withdrawalResolver.editWithdrawal(parent, args, ctx, info),
        deleteWithdrawal: (parent, args, ctx, info) => withdrawalResolver.deleteWithdrawal(parent, args, ctx, info),
      },
    };

    const permissions = {
      Query: {
        getExchangeById: this.guardByLoggedInUser(),
        getExchangesByUserId: this.guardByLoggedInUser(),

        getDepositActionById: this.guardByLoggedInUser(),
        getDepositActionsByUserId: this.guardByLoggedInUser(),

        getWithdrawalActionById: this.guardByLoggedInUser(),
        getWithdrawalActionsByUserId: this.guardByLoggedInUser(),

        getDepositById: this.guardByLoggedInUser(),
        getDepositsByUserId: this.guardByLoggedInUser(),
        getDepositsByDepositActionId: this.guardByLoggedInUser(),

        getWithdrawalById: this.guardByLoggedInUser(),
        getWithdrawalsByUserId: this.guardByLoggedInUser(),
        getWithdrawalsByWithdrawalActionId: this.guardByLoggedInUser(),
      },
      Mutation: {
        addExchange: this.guardByLoggedInUser(),
        editExchange: this.guardByLoggedInUser(),
        deleteExchange: this.guardByLoggedInUser(),

        addDepositAction: this.guardByLoggedInUser(),
        editDepositAction: this.guardByLoggedInUser(),
        deleteDepositAction: this.guardByLoggedInUser(),

        addWithdrawalAction: this.guardByLoggedInUser(),
        editWithdrawalAction: this.guardByLoggedInUser(),
        deleteWithdrawalAction: this.guardByLoggedInUser(),

        addDeposit: this.guardByLoggedInUser(),
        editDeposit: this.guardByLoggedInUser(),
        deleteDeposit: this.guardByLoggedInUser(),

        addWithdrawal: this.guardByLoggedInUser(),
        editWithdrawal: this.guardByLoggedInUser(),
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
      const _e = e;
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
}

export default ActionBank;