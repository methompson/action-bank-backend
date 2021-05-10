import {
  MutateDataException,
  QueryDataException,
} from '@root/exceptions/graphql-exceptions';

class WithdrawalResolver {
  async getWithdrawalById(parent, args, ctx, info) {
    throw new QueryDataException('Uninmplemented Resolver');
  }

  async getWithdrawalsByUserId(parent, args, ctx, info) {
    throw new QueryDataException('Uninmplemented Resolver');
  }

  async getWithdrawalsByWithdrawalActionId(parent, args, ctx, info) {
    throw new QueryDataException('Uninmplemented Resolver');
  }

  async addWithdrawal(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }

  async editWithdrawal(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }

  async deleteWithdrawal(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }
}

export default WithdrawalResolver;