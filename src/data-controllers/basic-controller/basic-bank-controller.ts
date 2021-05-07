import { NewDepositAction, DepositAction } from '@dataTypes';
import { BankController } from '@root/data-controllers/interfaces';

class BasicBankController implements BankController {
  addDepositAction: (action: NewDepositAction) => DepositAction;

}