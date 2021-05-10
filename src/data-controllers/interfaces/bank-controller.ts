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
} from '@dataTypes';

interface BankController {
  // Exchanges
  getExchangeById: (id: string) => Promise<Exchange>;
  getExchangesByUserId: (id: string) => Promise<Exchange[]>;
  addExchange: (userId: string, exchange: NewExchange) => Promise<Exchange>;
  editExchange: (exhcnage: Exchange) => Promise<Exchange>;
  deleteExchange: (id: string) => Promise<string>;

  // Deposit Actions
  getDepositActionById: (id: string) => Promise<DepositAction>;
  getDepositActionsByUserId: (userId: string) => Promise<DepositAction[]>;
  addDepositAction: (userId: string, action: NewDepositAction) => Promise<DepositAction>;
  editDepositAction: (action: DepositAction) => Promise<DepositAction>;
  deleteDepositAction: (id: string) => Promise<null>;

  // Withdrawal Actions
  getWithdrawalActionById: (id: string) => Promise<WithdrawalAction>;
  getWithdrawalActionsByUserId: (userId: string) => Promise<WithdrawalAction[]>;
  addWithdrawalAction: (userId: string, action: NewWithdrawalAction) => Promise<WithdrawalAction>;
  editWithdrawalAction: (action: WithdrawalAction) => Promise<WithdrawalAction>;
  deleteWithdrawalAction: (userId: string) => Promise<string>;

  // Deposits
  getDepositById: (id: string) => Promise<Deposit>;
  getDepositsByUserId: (userId: string) => Promise<Deposit[]>;
  getDepositsByDepositActionId: (actionId: string) => Promise<Deposit[]>;
  addDeposit: (userId: string, deposit: NewDeposit) => Promise<Deposit>;
  editDeposit: (deposit: Deposit) => Promise<Deposit>;
  deleteDeposit: (userId: string) => Promise<string>;

  // Withdrawals
  getWithdrawalById: (id: string) => Promise<Withdrawal>;
  getWithdrawalsByUserIdv: (userId: string) => Promise<Withdrawal[]>;
  getWithdrawalsByWithdrawalActionId: (actionId: string) => Promise<Withdrawal[]>;
  addWithdrawal: (userId: string, withdrawal: Withdrawal) => Promise<Withdrawal>;
  editWithdrawal: (withdrawal: Withdrawal) => Promise<Withdrawal>;
  deleteWithdrawal: (userId: string) => Promise<string>;

}

export default BankController;