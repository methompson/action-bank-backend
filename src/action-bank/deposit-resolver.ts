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
import { UserToken, Deposit, NewDeposit } from '@dataTypes';

class DepositResolver extends CommonResolver {
  constructor(protected dataController: DataController) {
    super();
  }

  async getDepositById(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.depositId)
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
      const deposit = await this.dataController.bankController.getDepositById(args.depositId);

      if (deposit.userId !== userToken.userId) {
        throw new Error('Invalid User Id');
      }

      return deposit;
    } catch(e) {
      throw new QueryDataException('Deposit Does Not Exist');
    }
  }

  async getDepositsByUserId(parent, args, ctx, info) {
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
      const deposits = await this.dataController.bankController.getDepositsByUserId(args.userId);

      return deposits;
    } catch(e) {
      throw new QueryDataException('Deposit Does Not Exist');
    }
  }

  async getDepositsByDepositActionId(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.depositActionId)
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
      const action = await this.dataController.bankController.getDepositActionById(args.depositActionId);

      if (action.userId !== userToken.userId) throw new Error('Unauthorized');
    } catch(e) {
      throw new QueryDataException('Deposit Action Does Not Exist');
    }

    try {
      const deposits = await this.dataController.bankController.getDepositsByDepositActionId(args.depositActionId);

      return deposits;
    } catch(e) {
      throw new QueryDataException('Deposit Does Not Exist');
    }
  }

  async addDeposit(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.depositActionId)
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
      const action = await this.dataController.bankController.getDepositActionById(args.depositActionId);
      if (action.userId !== userToken.userId) throw new Error('Unauthorized');

      const newDeposit = NewDeposit.fromDepositAction(action, userToken.userId, args.quantity);

      const deposit = await this.dataController.bankController.addDeposit(newDeposit);
      return deposit;
    } catch(e) {
      console.log(`Error Adding New Deposit: ${e}`);
      throw new MutateDataException('Error Adding New Deposit');
    }
  }

  async editDeposit(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.depositId)
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

    let oldDeposit: Deposit;
    try {
      oldDeposit = await this.dataController.bankController.getDepositById(args.depositId);
    } catch (e) {
      throw new MutateDataException('Deposit Does Not Exist');
    }

    if (oldDeposit.userId !== userToken.userId) {
      throw new MutateDataException('Deposit Does Not Exist');
    }

    const newDeposit = new Deposit(
      oldDeposit.id,
      oldDeposit.userId,
      oldDeposit.exchangeId,
      oldDeposit.depositActionId,
      oldDeposit.depositActionName,
      oldDeposit.uomQuantity,
      oldDeposit.depositQuantity,
      args.quantity,
      oldDeposit.dateAdded,
    );

    try {
      const result = await this.dataController.bankController.editDeposit(newDeposit);
      return result;
    } catch(e) {
      throw new MutateDataException('Unable to Update Deposit');
    }
  }

  async deleteDeposit(parent, args, ctx, info) {
    if (!isRecord(args)
      || !isString(args.depositId)
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
      const deposit = await this.dataController.bankController.getDepositById(args.depositId);

      if (deposit.userId !== userToken.userId) {
        throw new Error('User Does Not have Access');
      }
    } catch (e) {
      if (e instanceof DataDoesNotExistException) {
        throw new MutateDataException('Deposit Does Not Exist');
      }

      throw new MutateDataException('Error Deleting Deposit');
    }

    try {
      const id = await this.dataController.bankController.deleteDeposit(args.depositId);
      return id;
    } catch(e) {
      if (e instanceof DataDoesNotExistException) {
        throw new MutateDataException('Deposit Does Not Exist');
      }

      throw new MutateDataException('Error Deleting Deposit');
    }
  }
}

export default DepositResolver;