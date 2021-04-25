import { DataController } from '@root/data-controllers/interfaces/';

import BasicUserController from './basic-user-controller';

class BasicDataController extends DataController {
  initialized = false;

  private _constructionOptions: Record<string, unknown>;

  constructor(options?: Record<string, unknown>) {
    super();
    this._constructionOptions = options ?? {};
  }

  async init() {

    const dataLocation = typeof this._constructionOptions?.dataLocation === 'string'
      ? this._constructionOptions.dataLocation
      :'./';

    const userController = new BasicUserController(dataLocation);

    try {
      await userController.readUserData();

    } catch(e) {
      console.log('Read error');
    }

    this._userController = userController;


    console.log('initialized');

    this.initialized = true;

    return;
  }
}

export default BasicDataController;