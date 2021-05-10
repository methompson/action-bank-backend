import {
  MutateDataException,
  QueryDataException,
} from '@root/exceptions/graphql-exceptions';

class WithdrawalAction {
  async getWithdrawalActionById(parent, args, ctx, info) {
    throw new QueryDataException('Uninmplemented Resolver');
  }

  async getWithdrawalActionByUserId(parent, args, ctx, info) {
    throw new QueryDataException('Uninmplemented Resolver');
  }

  async addWithdrawalAction(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }

  async editWithdrawalAction(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }

  async deleteWithdrawalAction(parent, args, ctx, info) {
    throw new MutateDataException('Unimplemented Resolver');
  }
}

export default WithdrawalAction;