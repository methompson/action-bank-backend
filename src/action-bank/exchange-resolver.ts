import { DataController } from '@root/data-controllers';
import {
  MutateDataException,
  QueryDataException,
} from '@root/exceptions/graphql-exceptions';
import {
  isRecord,
  isString,
} from '@dataTypes/type-guards';
import CommonResolver from './common-resolver';
import { Exchange, NewExchange, UserToken } from '@dataTypes';
import { DataDoesNotExistException } from '@root/exceptions/data-controller-exceptions';

class ExchangeResolver extends CommonResolver {
  constructor(protected dataController: DataController) {
    super();
  }

  async getExchangeById(parent, args, ctx, info) {
    if (!isRecord(args) || !isString(args.exchangeId)) { return null; }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new QueryDataException('Invalid User Token');
    }

    try {
      const ex = await this.dataController.bankController.getExchangeById(args.exchangeId);

      if (ex.userId !== userToken.userId) {
        throw new Error('User Does Not have Access');
      }

      return ex;
    } catch(e) {
      if (e instanceof DataDoesNotExistException) {
        throw new QueryDataException('Exchange Does Not Exist');
      }

      throw new QueryDataException('Error Retrieving Exchange');
    }
  }

  async getExchangesByUserId(parent, args, ctx, info) {
    if (!isRecord(args) || !isString(args.userId)) { return null; }

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
      const ex = await this.dataController.bankController.getExchangesByUserId(args.userId);
      return ex;
    } catch(e) {
      throw new QueryDataException('Server Error Trying to Retrieve Exchanges');
    }
  }

  async addExchange(parent, args, ctx, info) {
    if (!isRecord(args) || !isString(args.name)) { return null; }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new MutateDataException('Invalid User Token');
    }

    const newExchange: NewExchange = new NewExchange(args.name, userToken.userId);

    try {
      const ex = await this.dataController.bankController.addExchange(newExchange);
      return ex;
    } catch(e) {
      throw new MutateDataException('Unable to Add Exchange');
    }
  }

  // We need to make sure that the exchange actually belongs to the user
  async editExchange(parent, args, ctx, info) {
    // throw new MutateDataException('Unimplemented Resolver');
    if (!isRecord(args)
      || !isString(args.exchangeId)
      || !isString(args.name)
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

    try {
      const ex = await this.dataController.bankController.editExchange(args.exchangeId, args.name);
      return ex;
    } catch(e) {
      throw new MutateDataException('Server Error Updating Deposit Action');
    }
  }

  async deleteExchange(parent, args, ctx, info) {
    if (!isRecord(args) || !isString(args.exchangeId)) {
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

    try {
      const exId = await this.dataController.bankController.deleteExchange(args.exchangeId);
      return exId;
    } catch(e) {
      throw new MutateDataException('Unable to delete Exchange');
    }
  }
}

export default ExchangeResolver;