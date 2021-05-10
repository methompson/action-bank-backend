import {
  MutateDataException,
  QueryDataException,
} from '@root/exceptions/graphql-exceptions';

class DepositActionResolver {
  async getDepositActionById(parent, args, ctx, info) {
    throw new QueryDataException('Uninmplemented Resolver');
  }

  async getDepositActionsByUserId(parent, args, ctx, info) {
    throw new QueryDataException('Uninmplemented Resolver');
  }

  async addDepositAction(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }

  async editDepositAction(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }

  async deleteDepositAction(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }
}

export default DepositActionResolver;