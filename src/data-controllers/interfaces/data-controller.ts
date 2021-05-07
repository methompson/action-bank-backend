import UserController from './user-controller';
import ProgramContext from '@dataTypes/program-context';
import { UserExistsException } from '@root/exceptions/user-exceptions';

abstract class DataController {
  programContext: ProgramContext;

  protected _userController: UserController;

  get userController(): UserController {
    return this._userController;
  }

  constructor(
    programContext: ProgramContext,
    userController: UserController,
  ) {
    this.programContext = programContext,
    this._userController = userController;
  }

  static async init(programContext: ProgramContext, options?: Record<string, unknown>): Promise<DataController> {
    throw new Error('Unimplemented');
  }
}

export default DataController;