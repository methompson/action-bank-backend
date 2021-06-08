import {
  Collection,
  MongoClient,
  ObjectId,
} from 'mongodb';

import {
  Exchange,
  NewExchange,
  DepositAction,
  NewDepositAction,
  WithdrawalAction,
  NewWithdrawalAction,
  Deposit,
  NewDeposit,
  Withdrawal,
  NewWithdrawal,
  ProgramContext,
} from '@dataTypes';
import { BankController } from '@root/data-controllers/interfaces';
import { MutateDataException, QueryDataException } from '@root/exceptions/graphql-exceptions';
import { isRecord } from '@dataTypes/type-guards';

class MongoDBBankController implements BankController {
  constructor(
    protected programContext: ProgramContext,
    protected client: MongoClient,
  ) {}

  get exchangeCollection(): Collection { return this.client.db('action-bank').collection('exchanges'); }
  get depositActionCollection(): Collection { return this.client.db('action-bank').collection('depositActions'); }
  get withdrawalActionCollection(): Collection { return this.client.db('action-bank').collection('withdrawalActions'); }
  get depositCollection(): Collection { return this.client.db('action-bank').collection('deposits'); }
  get withdrawalCollection(): Collection { return this.client.db('action-bank').collection('withdrawals'); }

  async getExchangeById(exchangeId: string): Promise<Exchange> {
    const _id = new ObjectId(exchangeId);

    const matcher = { $match: { _id } };

    const result = await this.queryExchangeData(matcher);

    if (result.length !== 1) {
      throw new QueryDataException('Invalid Exchange Result');
    }

    const rawData = result[0];

    const ex = this.compileExchangeFromData(rawData);

    return ex;
  }

  async getExchangesByUserId(userId: string): Promise<Exchange[]> {
    const matcher = { $match: { userId } };

    const results = await this.queryExchangeData(matcher);

    const exchanges: Exchange[] = [];

    results.forEach((result) => {
      try {
        const ex = this.compileExchangeFromData(result);
        exchanges.push(ex);
      } catch(_) {}
    });

    return exchanges;
  }

  protected async queryExchangeData(matcher: Record<string, unknown>): Promise<unknown[]> {
    return await this.exchangeCollection.aggregate([
      matcher,
      {
        $project: {
          id: {
            $toString: '$_id',
          },
          userId: 1,
          name: 1,
          description: {
            $ifNull: ['$description', '']
          },
        },
      },
      {
        $lookup: {
          from: 'depositActions',
          localField: 'id',
          foreignField: 'exchangeId',
          as: 'depositActions',
        },
      },
      {
        $lookup: {
          from: 'withdrawalActions',
          localField: 'id',
          foreignField: 'exchangeId',
          as: 'withdrawalActions',
        },
      },
      {
        $lookup: {
          from: 'deposits',
          localField: 'id',
          foreignField: 'exchangeId',
          as: 'deposits',
        },
      },
      {
        $lookup: {
          from: 'withdrawals',
          localField: 'id',
          foreignField: 'exchangeId',
          as: 'withdrawals',
        },
      },
    ]).toArray();
  }

  protected compileExchangeFromData(rawData: unknown): Exchange {
    if (!isRecord(rawData)) {
      throw new MutateDataException('Invalid Data');
    }

    const ex = Exchange.fromJSON({
      ...rawData
    });

    const depositActions: DepositAction[] = [];
    const withdrawalActions: WithdrawalAction[] = [];
    const deposits: Deposit[] = [];
    const withdrawals: Withdrawal[] = [];

    const da = rawData.depositActions;

    if (Array.isArray(da)) {
      da.forEach((dat) => {
        try {
          const id = dat._id.toString();
          const ac = DepositAction.fromJSON({ ...dat, id });
          depositActions.push(ac);
        } catch(_) {}
      });
    }

    const wa = rawData.withdrawalActions;

    if (Array.isArray(wa)) {
      wa.forEach((dat) => {
        try {
          const id = dat._id.toString();
          const ac = WithdrawalAction.fromJSON({ ...dat, id });
          withdrawalActions.push(ac);
        } catch(_) {}
      });
    }

    const dep = rawData.deposits;
    if (Array.isArray(dep)) {
     dep.forEach((dat) => {
        try {
          const id = dat._id.toString();
          const dep = Deposit.fromJSON({ ...dat, id });
          deposits.push(dep);
        } catch(_) {}
      });
    }

    const wd = rawData.withdrawals;
    if (Array.isArray(wd)) {
      wd.forEach((dat) => {
        try {
          const id = dat._id.toString();
          const w = Withdrawal.fromJSON({ ...dat, id });
          withdrawals.push(w);
        } catch(_) {}
      });
    }

    ex.setActionsAndExchanges(
      depositActions,
      withdrawalActions,
      deposits,
      withdrawals,
    );

    return ex;
  }

  async addExchange(exchange: NewExchange): Promise<Exchange> {
    const result = await this.exchangeCollection.insertOne(exchange.toJSON());

    const id = result.insertedId;

    if (result.insertedCount !== 1) {
      throw new MutateDataException('No Exchanges Added');
    }

    const savedExchange = Exchange.fromNewExchange(id.toString(), exchange);

    return savedExchange;
  }

  async editExchange(newExchange: Exchange): Promise<Exchange> {
    const _id = new ObjectId(newExchange.id);

    const result = await this.exchangeCollection.updateOne(
      { _id },
      { $set: { name: newExchange.name } },
      { upsert: false },
    );

    if (result.modifiedCount !== 1) {
      throw new MutateDataException('No Exchanges Updated');
    }

    return newExchange;
  }

  async deleteExchange(exchangeId: string): Promise<string> {
    const _id = new ObjectId(exchangeId);

    const result = await this.exchangeCollection.deleteOne({ _id });

    if (result.deletedCount !== 1) {
      throw new MutateDataException('No Exchanges Deleted');
    }

    return exchangeId;
  }

  async getDepositActionById(depositActionId: string): Promise<DepositAction> {
    const _id = new ObjectId(depositActionId);
    const result = await this.depositActionCollection.findOne({
      _id,
    });

    const id = result._id.toString();
    const ac = DepositAction.fromJSON({
      ...result,
      id,
    });

    return ac;
  }

  async getDepositActionsByUserId(userId: string): Promise<DepositAction[]> {
    const results = await this.depositActionCollection.find({
      userId: userId,
    }).toArray();

    const actions: DepositAction[] = [];

    results.forEach((result) => {
      try {
        const id = result._id.toString();
        const ac = DepositAction.fromJSON({
          ...result,
          id,
        });
        actions.push(ac);
      } catch(e) {}
    });

    return actions;
  }

  async addDepositAction(newAction: NewDepositAction): Promise<DepositAction> {
    const action = {
      ...newAction.toJSON(),
      sortedLocation: -1,
    };

    const result = await this.depositActionCollection.insertOne(action);

    if (result.insertedCount !== 1) {
      throw new MutateDataException('No Deposit Actions Added');
    }

    const id = result.insertedId;

    const savedAction = DepositAction.fromNewDepositAction(newAction, id.toString(), -1);

    return savedAction;
  }

  async editDepositAction(action: DepositAction): Promise<DepositAction> {
    const _id = new ObjectId(action.id);

    const output: Record<string, unknown> = action.toJSON();
    delete output.id;

    const result = await this.depositActionCollection.updateOne(
      { _id },
      { $set: { ...output } },
      { upsert: false },
    );

    if (result.modifiedCount !== 1) {
      throw new MutateDataException('No Deposit Actions Updated');
    }

    return action;
  }

  async deleteDepositAction(depositActionId: string): Promise<string> {
    const _id = new ObjectId(depositActionId);

    await this.depositActionCollection.deleteOne({ _id });

    return depositActionId;
  }

  async getWithdrawalActionById(withdrawalId: string): Promise<WithdrawalAction> {
    const _id = new ObjectId(withdrawalId);
    const result = await this.withdrawalActionCollection.findOne({
      _id,
    });

    const id = result._id.toString();
    const ac = WithdrawalAction.fromJSON({
      ...result,
      id,
    });

    return ac;
  }

  async getWithdrawalActionsByUserId(userId: string): Promise<WithdrawalAction[]> {
    const results = await this.withdrawalActionCollection.find({ userId }).toArray();

    const actions: WithdrawalAction[] = [];

    results.forEach((result) => {
      try {
        const id = result._id.toString();
        const ac = WithdrawalAction.fromJSON({
          ...result,
          id,
        });
        actions.push(ac);
      } catch(e) {}
    });

    return actions;
  }

  async addWithdrawalAction(newAction: NewWithdrawalAction): Promise<WithdrawalAction> {
    const action = {
      ...newAction.toJSON(),
      sortedLocation: -1,
    };

    const result = await this.withdrawalActionCollection.insertOne(action);

    if (result.insertedCount !== 1) {
      throw new MutateDataException('No Withdrawal Actions Added');
    }

    const id = result.insertedId;

    const savedAction = WithdrawalAction.fromNewWithdrawalAction(newAction, id.toString(), -1);

    return savedAction;
  }

  async editWithdrawalAction(action: WithdrawalAction): Promise<WithdrawalAction> {
    const _id = new ObjectId(action.id);

    const output: Record<string, unknown> = action.toJSON();
    delete output.id;

    const result = await this.withdrawalActionCollection.updateOne(
      { _id },
      { $set: { ...output } },
      { upsert: false },
    );

    if (result.modifiedCount !== 1) {
      throw new MutateDataException('No Withdrawal Actions Updated');
    }

    return action;
  }

  async deleteWithdrawalAction(withdrawalActionId: string): Promise<string> {
    const _id = new ObjectId(withdrawalActionId);

    const result = await this.withdrawalActionCollection.deleteOne({ _id });

    if (result.deletedCount !== 1) {
      throw new MutateDataException('No Withdrawal Actions Deleted');
    }

    return withdrawalActionId;
  }

  async getDepositById(depositId: string): Promise<Deposit> {
    const _id = new ObjectId(depositId);
    const result = await this.depositCollection.findOne({
      _id,
    });

    const dep = Deposit.fromJSON({
      ...result,
      id: depositId,
    });

    return dep;
  }

  async getDepositsByUserId(userId: string): Promise<Deposit[]> {
    const results = await this.depositCollection.find({ userId }).toArray();

    const deposits: Deposit[] = [];

    results.forEach((result) => {
      try {
        const id = result._id.toString();
        const dep = Deposit.fromJSON({
          ...result,
          id,
        });

        deposits.push(dep);
      } catch(_) {}
    });

    return deposits;
  }

  async getDepositsByDepositActionId(depositActionId: string): Promise<Deposit[]> {
    const results = await this.depositCollection.find({ depositActionId }).toArray();

    const deposits: Deposit[] = [];

    results.forEach((result) => {
      try {
        const id = result._id.toString();
        const dep = Deposit.fromJSON({
          ...result,
          id,
        });

        deposits.push(dep);
      } catch(_) {}
    });

    return deposits;
  }

  async addDeposit(newDeposit: NewDeposit): Promise<Deposit> {
    const result = await this.depositCollection.insertOne(newDeposit.toJSON());

    if (result.insertedCount !== 1) {
      throw new MutateDataException('No Deposits Added');
    }

    const id = result.insertedId;

    const savedDeposit = Deposit.fromNewDeposit(newDeposit, id);

    return savedDeposit;
  }

  async editDeposit(deposit: Deposit): Promise<Deposit> {
    const _id = new ObjectId(deposit.id);

    const output: Record<string, unknown> = deposit.toJSON();
    delete output.id;

    const result = await this.depositCollection.updateOne(
      { _id },
      { $set: { ...output } },
      { upsert: false },
    );

    if (result.modifiedCount !== 1) {
      throw new MutateDataException('No Deposits Updated');
    }

    return deposit;
  }

  async deleteDeposit(depositId: string): Promise<string> {
    const _id = new ObjectId(depositId);

    const result = await this.depositCollection.deleteOne({ _id });

    if (result.deletedCount !== 1) {
      throw new MutateDataException('No Deposits Deleted');
    }

    return depositId;
  }

  async getWithdrawalById(withdrawalId: string): Promise<Withdrawal> {
    const _id = new ObjectId(withdrawalId);
    const result = await this.withdrawalCollection.findOne({
      _id,
    });

    const withdrawal = Withdrawal.fromJSON({
      ...result,
      id: withdrawalId,
    });

    return withdrawal;
  }

  async getWithdrawalsByUserId(userId: string): Promise<Withdrawal[]> {
    const results = await this.withdrawalCollection.find({ userId }).toArray();

    const withdrawals: Withdrawal[] = [];

    results.forEach((result) => {
      try {
        const id = result._id.toString();
        const w = Withdrawal.fromJSON({
          ...result,
          id,
        });

        withdrawals.push(w);
      } catch(_) {}
    });

    return withdrawals;
  }

  async getWithdrawalsByWithdrawalActionId(withdrawalActionId: string): Promise<Withdrawal[]> {
    const results = await this.withdrawalCollection.find({ withdrawalActionId }).toArray();

    const deposits: Withdrawal[] = [];

    results.forEach((result) => {
      try {
        const id = result._id.toString();
        const w = Withdrawal.fromJSON({
          ...result,
          id,
        });

        deposits.push(w);
      } catch(_) {}
    });

    return deposits;
  }

  async addWithdrawal(newWithdrawal: NewWithdrawal): Promise<Withdrawal> {
    const result = await this.withdrawalCollection.insertOne(newWithdrawal.toJSON());

    if (result.insertedCount !== 1) {
      throw new MutateDataException('No Withdrawals Added');
    }

    const id = result.insertedId;

    const savedWithdrawal = Withdrawal.fromNewWithdrawal(newWithdrawal, id);

    return savedWithdrawal;
  }

  async editWithdrawal(withdrawal: Withdrawal): Promise<Withdrawal> {
    const _id = new ObjectId(withdrawal.id);

    const output: Record<string, unknown> = withdrawal.toJSON();
    delete output.id;

    const result = await this.withdrawalCollection.updateOne(
      { _id },
      { $set: { ...output } },
      { upsert: false },
    );

    if (result.modifiedCount !== 1) {
      throw new MutateDataException('No Withdrawals Updated');
    }

    return withdrawal;
  }

  async deleteWithdrawal(withdrawalId: string): Promise<string> {
    const _id = new ObjectId(withdrawalId);

    const result = await this.withdrawalCollection.deleteOne({ _id });

    if (result.deletedCount !== 1) {
      throw new MutateDataException('No Withdrawals Deleted');
    }

    return withdrawalId;
  }
}

export default MongoDBBankController;
