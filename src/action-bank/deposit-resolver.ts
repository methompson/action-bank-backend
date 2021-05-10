import {
  MutateDataException,
  QueryDataException,
} from '@root/exceptions/graphql-exceptions';

class DepositResolver {
  async getDepositById(parent, args, ctx, info) {
    throw new QueryDataException('Uninmplemented Resolver');
  }

  async getDepositsByUserId(parent, args, ctx, info) {
    throw new QueryDataException('Uninmplemented Resolver');
  }

  async getDepositsByDepositActionId(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }

  async addDeposit(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }

  async editDeposit(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }

  async deleteDeposit(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }
}

export default DepositResolver;