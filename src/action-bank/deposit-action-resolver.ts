import {
  MutateDataException,
  QueryDataException,
} from '@root/exceptions/graphql-exceptions';
import { DataController } from '@root/data-controllers';
import {
  isRecord,
  isString,
  isNumber,
  isBoolean,
} from '@dataTypes/type-guards';
import CommonResolver from './common-resolver';
import {
  UserToken,
  DepositAction,
  NewDepositAction,
  Exchange,
} from '@dataTypes';
import { DataDoesNotExistException } from '@root/exceptions/data-controller-exceptions';

class DepositActionResolver extends CommonResolver {
  constructor(protected dataController: DataController) {
    super();
  }

  async getDepositActionById(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.depositActionId)
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
      const depositAction = await this.dataController.bankController.getDepositActionById(args.depositActionId);

      if (depositAction.userId !== userToken.userId) {
        throw new QueryDataException('Deposit Action Does Not Exist');
      }

      return depositAction;
    } catch (e) {
      if (e instanceof DataDoesNotExistException) {
        throw new QueryDataException('Deposit Action Does Not Exist');
      }

      throw new QueryDataException('Error Retrieving Deposit Action');
    }
  }

  async getDepositActionsByUserId(parent, args, ctx, info) {
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
      const depositActions = await this.dataController.bankController.getDepositActionsByUserId(args.userId);
      return depositActions;
    } catch (e) {
      throw new QueryDataException('Error Retrieving Deposit Actions');
    }
  }

  async addDepositAction(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.name)
      || !isString(args.exchangeId)
      || !isString(args.uom)
      || !isNumber(args.uomQuantity)
      || !isNumber(args.depositQuantity)
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

    const newAction = new NewDepositAction(
      userToken.userId,
      args.exchangeId,
      args.name,
      args.uom,
      args.uomQuantity,
      args.depositQuantity,
      args.enabled,
    );

    try {
      const action = await this.dataController.bankController.addDepositAction(newAction);
      return action;
    } catch(e) {
      throw new MutateDataException('Unable to Add New Deposit Action');
    }
  }

  async editDepositAction(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.depositActionId)
    ){
      throw new MutateDataException('Invalid Data Provided');
    }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new MutateDataException('Invalid User Token');
    }

    let oldAction: DepositAction;
    try {
      oldAction = await this.dataController.bankController.getDepositActionById(args.depositActionId);
    } catch(e) {
      throw new MutateDataException('Deposit Action Does Not Exist');
    }

    if (oldAction.userId !== userToken.userId) {
      throw new MutateDataException('Unauthorized');
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
    const depositQuantity = isNumber(args.depositQuantity) ? args.depositQuantity : oldAction.depositQuantity;
    const enabled = isBoolean(args.enabled) ? args.enabled : oldAction.enabled;

    const newAction = new DepositAction(
      oldAction.id,
      oldAction.userId,
      exchangeId,
      name,
      uom,
      uomQuantity,
      depositQuantity,
      enabled,
      oldAction.sortedLocation,
      oldAction.dateAdded,
      new Date().getTime(),
    );

    try {
      const result = await this.dataController.bankController.editDepositAction(newAction);
      return result;
    } catch (e) {
      throw new MutateDataException('Unable to Update Deposit Action');
    }
  }

  async deleteDepositAction(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.depositActionId)
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
      const depositAction = await this.dataController.bankController.getDepositActionById(args.depositActionId);

      if (depositAction.userId !== userToken.userId) {
        throw new Error('User Does Not have Access');
      }
    } catch (e) {
      if (e instanceof DataDoesNotExistException) {
        throw new QueryDataException('Deposit Action Does Not Exist');
      }

      throw new QueryDataException('Error Deleting Deposit Action');
    }

    try {
      const id = await this.dataController.bankController.deleteDepositAction(args.depositActionId);
      return id;
    } catch(e) {
      if (e instanceof DataDoesNotExistException) {
        throw new QueryDataException('Deposit Action Does Not Exist');
      }

      throw new QueryDataException('Error Deleting Deposit Action');
    }
  }
}

export default DepositActionResolver;