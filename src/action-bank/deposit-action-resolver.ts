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
import { UserToken, DepositAction, NewDepositAction } from '@dataTypes';
import { DataDoesNotExistException } from '@root/exceptions/data-controller-exceptions';

class DepositActionResolver extends CommonResolver {
  constructor(protected dataController: DataController) {
    super();
  }

  async getDepositActionById(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args.depositActionId !== 'string'
    ){
      throw new QueryDataException('Invalid Data Provided');
    }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new QueryDataException('Invalid User Token');
    }

    let depositAction: DepositAction;

    try {
      depositAction = await this.dataController.bankController.getDepositActionById(args.depositActionId);
    } catch (e) {
      if (e instanceof DataDoesNotExistException) {
        throw new QueryDataException('Deposit Action Does Not Exist');
      }

      throw new QueryDataException('Error Retrieving Deposit Action');
    }

    if (depositAction.userId !== userToken.userId) {
      throw new QueryDataException('Deposit Action Does Not Exist');
    }

    return depositAction;
  }

  async getDepositActionsByUserId(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args.userId !== 'string'
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

    let depositActions: DepositAction[];

    try {
      depositActions = await this.dataController.bankController.getDepositActionsByUserId(args.userId);
    } catch (e) {
      throw new QueryDataException('Error Retrieving Deposit Actions');
    }

    return depositActions;
  }

  async addDepositAction(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args.name !== 'string'
      || typeof args.uom !== 'string'
      || typeof args.uomQuant !== 'number'
      || typeof args.depositQuant !== 'number'
      || typeof args.enabled !== 'boolean'
    ) {
      throw new MutateDataException('Invalid Data Provided');
    }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new MutateDataException('Invalid User Token');
    }

    const newAction = new NewDepositAction(
      userToken.userId,
      args.name,
      args.uom,
      args.uomQuant,
      args.depositQuant,
      args.enabled,
    );

    let action: DepositAction;

    try {
      action = await this.dataController.bankController.addDepositAction(newAction);
    } catch(e) {
      throw new MutateDataException('Unable to Add New Deposit Action');
    }

    return action;
  }

  async editDepositAction(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args.depositActionId !== 'string'
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

    const name = isString(args.name) ? args.name : oldAction.name;
    const uom = isString(args.uom) ? args.uom : oldAction.uom;
    const uomQuant = isNumber(args.uomQuant) ? args.uomQuant : oldAction.uomQuant;
    const depositQuant = isNumber(args.depositQuant) ? args.depositQuant : oldAction.depositQuant;
    const enabled = isBoolean(args.enabled) ? args.enabled : oldAction.enabled;

    const newAction = new DepositAction(
      oldAction.id,
      oldAction.userId,
      name,
      uom,
      uomQuant,
      depositQuant,
      enabled,
      oldAction.sortedLocation,
      oldAction.dateAdded,
      new Date().getTime(),
    );

    let returnVal: DepositAction;
    try {
      returnVal = await this.dataController.bankController.editDepositAction(newAction);
    } catch (e) {
      throw new MutateDataException('Unable to Update Deposit Action');
    }

    return returnVal;
  }

  async deleteDepositAction(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args.depositActionId !== 'string'
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

    let id: string;
    try {
      id = await this.dataController.bankController.deleteDepositAction(args.depositActionId);
    } catch(e) {
      if (e instanceof DataDoesNotExistException) {
        throw new QueryDataException('Deposit Action Does Not Exist');
      }

      throw new QueryDataException('Error Deleting Deposit Action');
    }

    return id;
  }
}

export default DepositActionResolver;