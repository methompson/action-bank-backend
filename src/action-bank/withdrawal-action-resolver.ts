import {
  MutateDataException,
  QueryDataException,
} from '@root/exceptions/graphql-exceptions';
import {
  isRecord,
  isString,
  isNumber,
  isBoolean,
} from '@dataTypes/type-guards';
import { DataDoesNotExistException } from '@root/exceptions/data-controller-exceptions';
import CommonResolver from './common-resolver';
import { DataController } from '@root/data-controllers';
import {
  UserToken,
  NewWithdrawalAction,
  WithdrawalAction,
  Exchange,
} from '@dataTypes';

class WithdrawalActionResolver extends CommonResolver {
  constructor(protected dataController: DataController) {
    super();
  }

  async getWithdrawalActionById(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.withdrawalActionId)
    ){
      throw new QueryDataException('Invalid Data Provided');
    }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new QueryDataException('Invalid User Token');
    }

    try {
      const withdrawalAction = await this.dataController.bankController.getWithdrawalActionById(args.withdrawalActionId);
      if (withdrawalAction.userId !== userToken.userId) {
        throw new QueryDataException('Withdrawal Action Does Not Exist');
      }

      return withdrawalAction;
    } catch (e) {
      if (e instanceof DataDoesNotExistException) {
        throw new QueryDataException('Withdrawal Action Does Not Exist');
      }

      throw new QueryDataException('Error Retrieving Withdrawal Action');
    }
  }

  async getWithdrawalActionsByUserId(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.userId)
    ){
      throw new QueryDataException('Invalid Data Provided');
    }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new QueryDataException('Invalid User Token');
    }

    if (userToken.userId !== args.userId) {
      throw new QueryDataException('Invalid user ID');
    }

    try {
      const withdrawalActions = await this.dataController.bankController.getWithdrawalActionsByUserId(args.userId);
      return withdrawalActions;
    } catch (e) {
      throw new QueryDataException('Error Retrieving Withdrawal Actions');
    }
  }

  async addWithdrawalAction(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.exchangeId)
      || !isString(args.name)
      || !isString(args.uom)
      || !isNumber(args.uomQuantity)
      || !isNumber(args.withdrawalQuantity)
      || !isBoolean(args.enabled)
    ) {
      throw new MutateDataException('Invalid Data Provided');
    }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new MutateDataException('Invalid User Token');
    }

    let exchange: Exchange;
    try {
      // Get exchange, compare user ID
      exchange = await this.dataController.bankController.getExchangeById(args.exchangeId);
    } catch(e) {
      throw new MutateDataException('Invalid Exchange');
    }

    if (exchange.userId !== userToken.userId) {
      throw new MutateDataException('Unauthorized Access');
    }

    const newAction = new NewWithdrawalAction(
      userToken.userId,
      args.exchangeId,
      args.name,
      args.uom,
      args.uomQuantity,
      args.withdrawalQuantity,
      args.enabled,
    );

    try {
      const action = await this.dataController.bankController.addWithdrawalAction(newAction);
      return action;
    } catch(e) {
      throw new MutateDataException('Unable to Add New Withdrawal Action');
    }
  }

  async editWithdrawalAction(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.withdrawalActionId)
    ){
      throw new MutateDataException('Invalid Data Provided');
    }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new MutateDataException('Invalid User Token');
    }

    let oldAction: WithdrawalAction;
    try {
      oldAction = await this.dataController.bankController.getWithdrawalActionById(args.withdrawalActionId);
    } catch(e) {
      throw new MutateDataException('Withdrawal Action Does Not Exist');
    }

    if (oldAction.userId !== userToken.userId) {
      throw new MutateDataException('Withdrawal Action Does Not Exist');
    }

    const exchangeId = isString(args.exchangeId) ? args.exchangeId : oldAction.exchangeId;
    // We've changed the exchange. Must get the exchange by ID and make sure that the userId
    // can access this exchange.
    try {
      if (exchangeId !== oldAction.exchangeId) {
        const exchange = await this.dataController.bankController.getExchangeById(exchangeId);

        if (exchange.userId !== userToken.userId) {
          throw new Error('Unauthorized');
        }
      }
    } catch(e) {
      throw new MutateDataException('Unauthorized');
    }

    const name = isString(args.name) ? args.name : oldAction.name;
    const uom = isString(args.uom) ? args.uom : oldAction.uom;
    const uomQuantity = isNumber(args.uomQuantity) ? args.uomQuantity : oldAction.uomQuantity;
    const withdrawalQuantity = isNumber(args.withdrawalQuantity) ? args.withdrawalQuantity : oldAction.withdrawalQuantity;
    const enabled = isBoolean(args.enabled) ? args.enabled : oldAction.enabled;

    const newAction = new WithdrawalAction(
      oldAction.id,
      oldAction.userId,
      exchangeId,
      name,
      uom,
      uomQuantity,
      withdrawalQuantity,
      enabled,
      oldAction.sortedLocation,
      oldAction.dateAdded,
      new Date().getTime(),
    );

    try {
      const returnVal = await this.dataController.bankController.editWithdrawalAction(newAction);

      return returnVal;
    } catch (e) {
      throw new MutateDataException('Unable to Update Withdrawal Action');
    }
  }

  async deleteWithdrawalAction(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.withdrawalActionId)
    ){
      throw new MutateDataException('Invalid Data Provided');
    }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new MutateDataException('Invalid User Token');
    }

    try {
      const withdrawalAction = await this.dataController.bankController.getWithdrawalActionById(args.withdrawalActionId);

      if (withdrawalAction.userId !== userToken.userId) {
        throw new Error('User Does Not have Access');
      }
    } catch (e) {
      if (e instanceof DataDoesNotExistException) {
        throw new MutateDataException('Withdrawal Action Does Not Exist');
      }

      throw new MutateDataException('Error Deleting Withdrawal Action');
    }

    try {
      const id = await this.dataController.bankController.deleteWithdrawalAction(args.withdrawalActionId);
      return id;
    } catch(e) {
      if (e instanceof DataDoesNotExistException) {
        throw new MutateDataException('Withdrawal Action Does Not Exist');
      }

      throw new MutateDataException('Error Deleting Withdrawal Action');
    }
  }
}

export default WithdrawalActionResolver;