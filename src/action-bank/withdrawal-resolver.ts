import {
  MutateDataException,
  QueryDataException,
} from '@root/exceptions/graphql-exceptions';
import {
  isRecord,
  isString,
  isNumber,
} from '@dataTypes/type-guards';
import { DataDoesNotExistException } from '@root/exceptions/data-controller-exceptions';
import CommonResolver from './common-resolver';
import { DataController } from '@root/data-controllers';
import { UserToken, NewWithdrawal, Withdrawal } from '@dataTypes';

class WithdrawalResolver extends CommonResolver {
  constructor(protected dataController: DataController) {
    super();
  }

  async getWithdrawalById(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.withdrawalId)
    ) {
      throw new QueryDataException('Invalid Data Provided');
    }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new QueryDataException('Invalid User Token');
    }

    try {
      const withdrawal = await this.dataController.bankController.getWithdrawalById(args.withdrawalId);

      if (withdrawal.userId !== userToken.userId) {
        throw new Error('Invalid User Id');
      }

      return withdrawal;
    } catch(e) {
      throw new QueryDataException('Withdrawal Does Not Exist');
    }
  }

  async getWithdrawalsByUserId(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.userId)
    ) {
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
      const withdrawals = await this.dataController.bankController.getWithdrawalsByUserId(args.userId);

      return withdrawals;
    } catch(e) {
      throw new QueryDataException('Withdrawal Does Not Exist');
    }
  }

  async getWithdrawalsByWithdrawalActionId(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.withdrawalActionId)
    ) {
      throw new QueryDataException('Invalid Data Provided');
    }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new QueryDataException('Invalid User Token');
    }

    try {
      const action = await this.dataController.bankController.getWithdrawalActionById(args.withdrawalActionId);

      if (action.userId !== userToken.userId) throw new Error('Unauthorized');
    } catch(e) {
      throw new QueryDataException('Withdrawal Action Does Not Exist');
    }

    try {
      const withdrawals = await this.dataController.bankController.getWithdrawalsByWithdrawalActionId(args.withdrawalActionId);

      return withdrawals;
    } catch(e) {
      throw new QueryDataException('Withdrawal Does Not Exist');
    }
  }

  async addWithdrawal(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.withdrawalActionId)
      || !isNumber(args.quantity)
    ) {
      throw new MutateDataException('Invalid Data Provided');
    }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new MutateDataException('Invalid User Token');
    }

    try {
      const action = await this.dataController.bankController.getWithdrawalActionById(args.withdrawalActionId);
      if (action.userId !== userToken.userId) throw new Error('Unauthorized');

      const newWithdrawal = NewWithdrawal.fromWithdrawalAction(action, userToken.userId, args.quantity);

      const withdrawal = await this.dataController.bankController.addWithdrawal(newWithdrawal);
      return withdrawal;
    } catch(e) {
      console.log(`Error Adding New Withdrawal: ${e}`);
      throw new MutateDataException('Error Adding New Withdrawal');
    }
  }

  async editWithdrawal(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.withdrawalId)
      || !isNumber(args.quantity)
    ){
      throw new MutateDataException('Invalid Data Provided');
    }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new MutateDataException('Invalid User Token');
    }

    let oldWithdrawal: Withdrawal;
    try {
      oldWithdrawal = await this.dataController.bankController.getWithdrawalById(args.withdrawalId);
    } catch (e) {
      throw new MutateDataException('Withdrawal Does Not Exist');
    }

    if (oldWithdrawal.userId !== userToken.userId) {
      throw new MutateDataException('Withdrawal Does Not Exist');
    }

    const newWithdrawal = new Withdrawal(
      oldWithdrawal.id,
      oldWithdrawal.userId,
      oldWithdrawal.exchangeId,
      oldWithdrawal.withdrawalActionId,
      oldWithdrawal.withdrawalActionName,
      oldWithdrawal.uomQuantity,
      oldWithdrawal.withdrawalQuantity,
      args.quantity,
      oldWithdrawal.dateAdded,
    );

    try {
      const result = await this.dataController.bankController.editWithdrawal(newWithdrawal);
      return result;
    } catch(e) {
      throw new MutateDataException('Unable to Update Withdrawal');
    }
  }

  async deleteWithdrawal(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.withdrawalId)
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
      const withdrawal = await this.dataController.bankController.getWithdrawalById(args.withdrawalId);

      if (withdrawal.userId !== userToken.userId) {
        throw new Error('User Does Not have Access');
      }
    } catch (e) {
      if (e instanceof DataDoesNotExistException) {
        throw new MutateDataException('Withdrawal Does Not Exist');
      }

      throw new MutateDataException('Error Deleting Withdrawal');
    }

    try {
      const id = await this.dataController.bankController.deleteWithdrawal(args.withdrawalId);
      return id;
    } catch(e) {
      if (e instanceof DataDoesNotExistException) {
        throw new MutateDataException('Withdrawal Does Not Exist');
      }

      throw new MutateDataException('Error Deleting Withdrawal');
    }
  }
}

export default WithdrawalResolver;