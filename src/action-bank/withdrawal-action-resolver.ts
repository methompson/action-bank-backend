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
import { UserToken, NewWithdrawalAction, WithdrawalAction } from '@dataTypes';

class WithdrawalActionResolver extends CommonResolver {
  constructor(protected dataController: DataController) {
    super();
  }

  async getWithdrawalActionById(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args.withdrawalActionId !== 'string'
    ){
      throw new QueryDataException('Invalid Data Provided');
    }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new QueryDataException('Invalid User Token');
    }

    let withdrawalAction: WithdrawalAction;

    try {
      withdrawalAction = await this.dataController.bankController.getWithdrawalActionById(args.withdrawalActionId);
    } catch (e) {
      if (e instanceof DataDoesNotExistException) {
        throw new QueryDataException('Withdrawal Action Does Not Exist');
      }

      throw new QueryDataException('Error Retrieving Withdrawal Action');
    }

    if (withdrawalAction.userId !== userToken.userId) {
      throw new QueryDataException('Withdrawal Action Does Not Exist');
    }

    return withdrawalAction;
  }

  async getWithdrawalActionsByUserId(parent, args, ctx, info) {
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

    let withdrawalActions: WithdrawalAction[];

    try {
      withdrawalActions = await this.dataController.bankController.getWithdrawalActionsByUserId(args.userId);
    } catch (e) {
      throw new QueryDataException('Error Retrieving Withdrawal Actions');
    }

    return withdrawalActions;
  }

  async addWithdrawalAction(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args.name !== 'string'
      || typeof args.uom !== 'string'
      || typeof args.uomQuant !== 'number'
      || typeof args.withdrawalQuant !== 'number'
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

    const newAction = new NewWithdrawalAction(
      userToken.userId,
      args.name,
      args.uom,
      args.uomQuant,
      args.withdrawalQuant,
      args.enabled,
    );

    let action: WithdrawalAction;

    try {
      action = await this.dataController.bankController.addWithdrawalAction(newAction);
    } catch(e) {
      throw new MutateDataException('Unable to Add New Withdrawal Action');
    }

    return action;
  }

  async editWithdrawalAction(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args.withdrawalActionId !== 'string'
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
      throw new MutateDataException('Unauthorized');
    }

    const name = isString(args.name) ? args.name : oldAction.name;
    const uom = isString(args.uom) ? args.uom : oldAction.uom;
    const uomQuant = isNumber(args.uomQuant) ? args.uomQuant : oldAction.uomQuant;
    const withdrawalQuant = isNumber(args.withdrawalQuant) ? args.withdrawalQuant : oldAction.withdrawalQuant;
    const enabled = isBoolean(args.enabled) ? args.enabled : oldAction.enabled;

    const newAction = new WithdrawalAction(
      oldAction.id,
      oldAction.userId,
      name,
      uom,
      uomQuant,
      withdrawalQuant,
      enabled,
      oldAction.sortedLocation,
      oldAction.dateAdded,
      new Date().getTime(),
    );

    let returnVal: WithdrawalAction;
    try {
      returnVal = await this.dataController.bankController.editWithdrawalAction(newAction);
    } catch (e) {
      throw new MutateDataException('Unable to Update Withdrawal Action');
    }

    return returnVal;
  }

  async deleteWithdrawalAction(parent, args, ctx, info) {
    if (!isRecord(args)
      || typeof args.withdrawalActionId !== 'string'
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
        throw new Error('User Does Not have Access');
      }
    } catch (e) {
      if (e instanceof DataDoesNotExistException) {
        throw new QueryDataException('Withdrawal Action Does Not Exist');
      }

      throw new QueryDataException('Error Deleting Withdrawal Action');
    }

    let id: string;
    try {
      id = await this.dataController.bankController.deleteWithdrawalAction(args.withdrawalActionId);
    } catch(e) {
      if (e instanceof DataDoesNotExistException) {
        throw new QueryDataException('Withdrawal Action Does Not Exist');
      }

      throw new QueryDataException('Error Deleting Withdrawal Action');
    }

    return id;
  }
}

export default WithdrawalActionResolver;