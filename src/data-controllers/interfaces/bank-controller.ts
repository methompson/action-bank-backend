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
  UserToken,
} from '@dataTypes';

interface BankController {
  // Exchanges
  getExchangeById: (exchangeId: string) => Promise<Exchange>;
  getExchangesByUserId: (userId: string) => Promise<Exchange[]>;
  addExchange: (exchange: NewExchange) => Promise<Exchange>;
  editExchange: (exchangeId: string, name: string) => Promise<Exchange>;
  deleteExchange: (exchangeId: string) => Promise<string>;

  // Deposit Actions
  getDepositActionById: (depositActionId: string) => Promise<DepositAction>;
  getDepositActionsByUserId: (userId: string) => Promise<DepositAction[]>;
  addDepositAction: (action: NewDepositAction) => Promise<DepositAction>;
  editDepositAction: (action: DepositAction) => Promise<DepositAction>;
  deleteDepositAction: (depositActionId: string) => Promise<string>;

  // Withdrawal Actions
  getWithdrawalActionById: (withdrawalId: string) => Promise<WithdrawalAction>;
  getWithdrawalActionsByUserId: (userId: string) => Promise<WithdrawalAction[]>;
  addWithdrawalAction: (action: NewWithdrawalAction) => Promise<WithdrawalAction>;
  editWithdrawalAction: (action: WithdrawalAction) => Promise<WithdrawalAction>;
  deleteWithdrawalAction: (withdrawalId: string) => Promise<string>;

  // Deposits
  getDepositById: (depositId: string) => Promise<Deposit>;
  getDepositsByUserId: (userId: string) => Promise<Deposit[]>;
  getDepositsByDepositActionId: (actionId: string) => Promise<Deposit[]>;
  addDeposit: (deposit: NewDeposit) => Promise<Deposit>;
  editDeposit: (deposit: Deposit) => Promise<Deposit>;
  deleteDeposit: (depositId: string) => Promise<string>;

  // Withdrawals
  getWithdrawalById: (withdrawalId: string) => Promise<Withdrawal>;
  getWithdrawalsByUserIdv: (userId: string) => Promise<Withdrawal[]>;
  getWithdrawalsByWithdrawalActionId: (actionId: string) => Promise<Withdrawal[]>;
  addWithdrawal: (withdrawal: NewWithdrawal) => Promise<Withdrawal>;
  editWithdrawal: (withdrawal: Withdrawal) => Promise<Withdrawal>;
  deleteWithdrawal: (withdrawalId: string) => Promise<string>;

}

export default BankController;