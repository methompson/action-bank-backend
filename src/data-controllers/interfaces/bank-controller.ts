import { DepositAction, NewDepositAction } from '@dataTypes';

interface BankController {
  addDepositAction: (action: NewDepositAction) => DepositAction;
}

export default BankController;