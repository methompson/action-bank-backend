import { MongoClient } from 'mongodb';

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

class MongoDBBankController implements BankController {
  constructor(
    protected programContext: ProgramContext,
    protected client: MongoClient,
  ) {}

  async getExchangeById(exchangeId: string): Promise<Exchange> { throw new Error('Unimplemented'); }
  async getExchangesByUserId(userId: string): Promise<Exchange[]> { throw new Error('Unimplemented'); }
  async addExchange(exchange: NewExchange): Promise<Exchange> { throw new Error('Unimplemented'); }
  async editExchange(exchangeId: string, name: string): Promise<Exchange> { throw new Error('Unimplemented'); }
  async deleteExchange(exchangeId: string): Promise<string> { throw new Error('Unimplemented'); }
  async getDepositActionById(depositActionId: string): Promise<DepositAction> { throw new Error('Unimplemented'); }
  async getDepositActionsByUserId(userId: string): Promise<DepositAction[]> { throw new Error('Unimplemented'); }
  async addDepositAction(action: NewDepositAction): Promise<DepositAction> { throw new Error('Unimplemented'); }
  async editDepositAction(action: DepositAction): Promise<DepositAction> { throw new Error('Unimplemented'); }
  async deleteDepositAction(depositActionId: string): Promise<string> { throw new Error('Unimplemented'); }
  async getWithdrawalActionById(withdrawalId: string): Promise<WithdrawalAction> { throw new Error('Unimplemented'); }
  async getWithdrawalActionsByUserId(userId: string): Promise<WithdrawalAction[]> { throw new Error('Unimplemented'); }
  async addWithdrawalAction(action: NewWithdrawalAction): Promise<WithdrawalAction> { throw new Error('Unimplemented'); }
  async editWithdrawalAction(action: WithdrawalAction): Promise<WithdrawalAction> { throw new Error('Unimplemented'); }
  async deleteWithdrawalAction(withdrawalId: string): Promise<string> { throw new Error('Unimplemented'); }
  async getDepositById(depositId: string): Promise<Deposit> { throw new Error('Unimplemented'); }
  async getDepositsByUserId(userId: string): Promise<Deposit[]> { throw new Error('Unimplemented'); }
  async getDepositsByDepositActionId(depositActionId: string): Promise<Deposit[]> { throw new Error('Unimplemented'); }
  async addDeposit(deposit: NewDeposit): Promise<Deposit> { throw new Error('Unimplemented'); }
  async editDeposit(deposit: Deposit): Promise<Deposit> { throw new Error('Unimplemented'); }
  async deleteDeposit(depositId: string): Promise<string> { throw new Error('Unimplemented'); }
  async getWithdrawalById(withdrawalId: string): Promise<Withdrawal> { throw new Error('Unimplemented'); }
  async getWithdrawalsByUserId(userId: string): Promise<Withdrawal[]> { throw new Error('Unimplemented'); }
  async getWithdrawalsByWithdrawalActionId(withdrawalActionId: string): Promise<Withdrawal[]> { throw new Error('Unimplemented'); }
  async addWithdrawal(withdrawal: NewWithdrawal): Promise<Withdrawal> { throw new Error('Unimplemented'); }
  async editWithdrawal(withdrawal: Withdrawal): Promise<Withdrawal> { throw new Error('Unimplemented'); }
  async deleteWithdrawal(withdrawalId: string): Promise<string> { throw new Error('Unimplemented'); }
}

export default MongoDBBankController;
