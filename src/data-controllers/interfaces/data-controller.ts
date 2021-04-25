import UserController from './user-controller';
import ProgramContext from '@dataTypes/program-context';

abstract class DataController {
  initialized: boolean;
  programContext: ProgramContext;

  protected _userController: UserController;

  get userController() { return this._userController; }

  async init(programContext: ProgramContext): Promise<void> {
    this.programContext = programContext;
  }
}

export default DataController;