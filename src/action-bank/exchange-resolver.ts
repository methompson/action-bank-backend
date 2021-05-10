import { DataController } from '@root/data-controllers';
import {
  MutateDataException,
  QueryDataException,
} from '@root/exceptions/graphql-exceptions';
import { isRecord } from '@dataTypes/type-guards';
import CommonResolver from './common-resolver';
import { NewExchange, UserToken } from '@dataTypes';

class ExchangeResolver extends CommonResolver {
  constructor(protected dataController: DataController) {
    super();
  }

  async getExchangeById(parent, args, ctx, info) {
    throw new QueryDataException('Uninmplemented Resolver');
  }

  async getExchangesByUserId(parent, args, ctx, info) {
    throw new QueryDataException('Uninmplemented Resolver');
  }

  async addExchanges(parent, args, ctx, info) {
    if (!isRecord(args) || typeof args.name !== 'string') { return null; }

    let userToken: UserToken;
    try {
      userToken = this.getUserTokenFromContext(ctx);
    } catch(e) {
      throw new MutateDataException('Invalid User Token');
    }

    console.log('Adding An Exchange');

    const newExchange: NewExchange = new NewExchange(args.name);

    const ex = await this.dataController.bankController.addExchange(userToken.userId, newExchange);

    return ex;
  }

  async editExchanges(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }

  async deleteExchanges(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }
}

export default ExchangeResolver;