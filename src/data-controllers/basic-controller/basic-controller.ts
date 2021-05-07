import { DataController, UserController } from '@root/data-controllers/interfaces/';
import { ProgramContext } from '@dataTypes';

import BasicUserController from './basic-user-controller';
import { UserExistsException } from '@root/exceptions/user-exceptions';

class BasicDataController extends DataController {
  private _constructionOptions: Record<string, unknown>;

  constructor(
    programContext: ProgramContext,
    userController: UserController,
    options?: Record<string, unknown>
  ) {
    super(programContext, userController);
    this._constructionOptions = options ?? {};
  }

  static async init(programContext: ProgramContext, options?: Record<string, unknown>): Promise<DataController> {
    const dataLocation = typeof options?.dataLocation === 'string'
      ? options.dataLocation
      :'./';

    const userController = new BasicUserController(dataLocation, programContext);

    try {
      await userController.readUserData();

    } catch(e) {
      console.log('Read error');
      throw new UserExistsException('Read Error');
    }

    console.log('initialized');

    return new BasicDataController(
      programContext,
      userController,
      options,
    );
  }
}

export default BasicDataController;