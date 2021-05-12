import { DataController } from '@root/data-controllers';
import {
  MutateDataException,
  QueryDataException,
} from '@root/exceptions/graphql-exceptions';
import { isRecord } from '@dataTypes/type-guards';
import CommonResolver from './common-resolver';
import { Exchange, NewExchange, UserToken } from '@dataTypes';
import { DataDoesNotExistException } from '@root/exceptions/data-controller-exceptions';

class ExchangeResolver extends CommonResolver {
  constructor(protected dataController: DataController) {
    super();
  }

  async getExchangeById(parent, args, ctx, info) {
    if (!isRecord(args) || typeof args.exchangeId !== 'string') { return null; }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new QueryDataException('Invalid User Token');
    }

    let ex: Exchange;
    try {
      ex = await this.dataController.bankController.getExchangeById(args.exchangeId);

      if (ex.userId !== userToken.userId) {
        throw new Error('User Does Not have Access');
      }
    } catch(e) {
      if (e instanceof DataDoesNotExistException) {
        throw new QueryDataException('Exchange Does Not Exist');
      }

      throw new QueryDataException('Error Retrieving Exchange');
    }

    return ex;
  }

  async getExchangesByUserId(parent, args, ctx, info) {
    if (!isRecord(args) || typeof args.userId !== 'string') { return null; }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new QueryDataException('Invalid User Token');
    }

    if (userToken.userId !== args.userId) {
      throw new QueryDataException('Invalid user ID');
    }

    let ex: Exchange[];
    try {
      ex = await this.dataController.bankController.getExchangesByUserId(args.userId);
    } catch(e) {
      throw new QueryDataException('Server Error Trying to Retrieve Exchanges');
    }

    return ex;
  }

  async addExchange(parent, args, ctx, info) {
    if (!isRecord(args) || typeof args.name !== 'string') { return null; }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new MutateDataException('Invalid User Token');
    }

    const newExchange: NewExchange = new NewExchange(args.name, userToken.userId);

    let ex: Exchange;
    try {
      ex = await this.dataController.bankController.addExchange(newExchange);
    } catch(e) {
      throw new MutateDataException('Unable to Add Exchange');
    }

    return ex;
  }

  // We need to make sure that the exchange actually belongs to the user
  async editExchange(parent, args, ctx, info) {
    // throw new MutateDataException('Unimplemented Resolver');
    if (!isRecord(args)
      || typeof args.exchangeId !== 'string'
      || typeof args.name !== 'string'
    ) {
      return null;
    }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new MutateDataException('Invalid User Token');
    }

    let currentEx: Exchange;
    try {
      currentEx = await this.dataController.bankController.getExchangeById(args.exchangeId);
    } catch(e) {
      throw new MutateDataException('Exchange Does Not Exist');
    }

    if (currentEx.userId !== userToken.userId) {
      throw new MutateDataException('Unauthorized');
    }

    let ex: Exchange;
    try {
      ex = await this.dataController.bankController.editExchange(args.exchangeId, args.name);
    } catch(e) {
      throw new MutateDataException('Server Error Updating Deposit Action');
    }

    return ex;
  }

  async deleteExchange(parent, args, ctx, info) {
    if (!isRecord(args) || typeof args.exchangeId !== 'string') {
      throw new MutateDataException('Invalid Data Provided');
     }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new MutateDataException('Invalid User Token');
    }

    let ex: Exchange;
    try {
      ex = await this.dataController.bankController.getExchangeById(args.exchangeId);

      if (ex.userId !== userToken.userId) {
        throw new Error('User Does Not have Access');
      }
    } catch(e) {
      if (e instanceof DataDoesNotExistException) {
        throw new QueryDataException('Exchange Does Not Exist');
      }

      throw new QueryDataException('Error Retrieving Exchange');
    }

    let exId: string;
    try {
      exId = await this.dataController.bankController.deleteExchange(args.exchangeId);
    } catch(e) {
      throw new MutateDataException('Unable to delete Exchange');
    }

    return exId;
  }
}

export default ExchangeResolver;