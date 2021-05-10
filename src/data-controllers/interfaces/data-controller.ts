import UserController from './user-controller';
import BankController from './bank-controller';

import ProgramContext from '@dataTypes/program-context';

abstract class DataController {
  programContext: ProgramContext;

  protected _userController: UserController;
  protected _bankController: BankController;

  get userController(): UserController { return this._userController; }
  get bankController(): BankController { return this._bankController; }

  constructor(
    programContext: ProgramContext,
    userController: UserController,
    bankController: BankController,
    options?: Record<string, unknown>
  ) {
    this.programContext = programContext;
    this._bankController = bankController;
    this._userController = userController;
  }

  static async init(programContext: ProgramContext, options?: Record<string, unknown>): Promise<DataController> {
    throw new Error('Unimplemented');
  }
}

export default DataController;