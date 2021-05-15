import { BankController, DataController, UserController } from '@root/data-controllers/interfaces/';
import { ProgramContext } from '@dataTypes';

import BasicUserController from './basic-user-controller';
import BasicBankController from './basic-bank-controller';
import { UserExistsException } from '@root/exceptions/user-exceptions';

class BasicDataController extends DataController {
  constructor(
    programContext: ProgramContext,
    userController: UserController,
    bankController: BankController,
  ) {
    super(programContext, userController, bankController);
  }

  static async init(programContext: ProgramContext, options?: Record<string, unknown>): Promise<DataController> {
    const dataLocation = typeof options?.dataLocation === 'string'
      ? options.dataLocation
      :'./';

    const userController = new BasicUserController(dataLocation, programContext);
    const bankController = new BasicBankController(dataLocation, programContext);

    try {
      await userController.readUserData();
    } catch(e) {
      console.log('Read error');
    }

    try {
      await bankController.readBankData();
    } catch(e) {
      console.log('Bank error');
    }

    console.log('initialized');

    return new BasicDataController(
      programContext,
      userController,
      bankController,
    );
  }
}

export default BasicDataController;