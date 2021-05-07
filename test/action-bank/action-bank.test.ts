import { UserTypeMap, ProgramContext, NewUser, User } from '@dataTypes';
import { ActionBank } from '@root/action-bank';
import { DataController } from '@root/data-controllers';
import { UserController } from '@root/data-controllers/interfaces/';

class TestUserController implements UserController {
  getUserByUsername = jest.fn((username: string): Promise<User> => { throw new Error('Unimplemented'); });
  getUserById = jest.fn((userId: string): Promise<User> => { throw new Error('Unimplemented'); });
  getUsers = jest.fn((pagination: number, page: number): Promise<User[]> => { throw new Error('Unimplemented'); });
  addUser = jest.fn((user: NewUser): Promise<User> => { throw new Error('Unimplemented'); });
  editUser = jest.fn((user: User): Promise<User> => { throw new Error('Unimplemented'); });
  makePasswordResetToken = jest.fn((userId: string, token: string): Promise<void> => { throw new Error('Unimplemented'); });
  updatePassword = jest.fn((userId: string, newPassword: string): Promise<void> => { throw new Error('Unimplemented'); });
  deleteUser = jest.fn((id: string): Promise<void> => { throw new Error('Unimplemented'); });
  isNoUsers = jest.fn((): Promise<boolean> => { throw new Error('Unimplemented'); });
}

class TestDataController extends DataController {
  // static async init(programContext: ProgramContext, options?: Record<string, unknown>): Promise<DataController> {
  //   const userController = new TestUserController;
  //   return new TestDataController(
  //     programContext,
  //     userController,
  //   );
  // }
}

describe('ActionBank', () => {
  describe('init', () => {
    test('Given a proper data controller with a user controller that reports isNoUsers is false, ActionBank will initialize without issue', async () => {
      const programContext: ProgramContext = {
        userTypeMap: new UserTypeMap,
      };

      const ab = new ActionBank();
      const tuc = new TestUserController();

      let er: Error | null = null;

      try {
        const tdc = new TestDataController(
          programContext,
          tuc,
        );

        tuc.isNoUsers.mockImplementationOnce(async () => {
          return false;
        });

        ab.init(tdc, {
          programContext,
        });

      } catch(e) {
        er = e;
      }

      expect(er).toBe(null);

      expect(tuc.isNoUsers).toHaveBeenCalledTimes(1);
      expect(tuc.addUser).toHaveBeenCalledTimes(0);
    });

    test('Given a proper data controller with a user controller that reports isNoUsers is true, ActionBank will initialize without issue and call addUser', async () => {
      const programContext: ProgramContext = {
        userTypeMap: new UserTypeMap,
      };

      const ab = new ActionBank();
      const tuc = new TestUserController();

      let er: Error | null = null;

      try {
        const tdc = new TestDataController(
          programContext,
          tuc,
        );

        tuc.isNoUsers.mockImplementationOnce(async () => {
          return true;
        });
        tuc.addUser.mockImplementationOnce(async (user: NewUser) => {
          const now = Date.now();
          return new User(
            '1',
            user.username,
            user.email,
            user.firstName,
            user.lastName,
            user.userType,
            user.passwordHash,
            user.userMeta,
            user.enabled,
            '',
            now,
            now,
            now,
          );
        });

        await ab.init(tdc, {
          programContext,
        });

      } catch(e) {
        er = e;
        console.log(e);
        // This causes the test to fail if the above fails.
      }

      expect(er).toBe(null);

      expect(tuc.isNoUsers).toHaveBeenCalledTimes(1);
      expect(tuc.addUser).toHaveBeenCalledTimes(1);

    });

    test('If isNoUsers throws an error, an error will propagate to the calling function', async () => {
      const programContext: ProgramContext = {
        userTypeMap: new UserTypeMap,
      };

      const testErrorResponse = 'Test Error 098asdlfkn';

      const ab = new ActionBank();
      const tuc = new TestUserController();

      let er: Error | null = null;

      try {
        const tdc = new TestDataController(
          programContext,
          tuc,
        );

        tuc.isNoUsers.mockImplementationOnce(async () => {
          throw new Error(testErrorResponse);
        });

        await ab.init(tdc, {
          programContext,
        });

      } catch(e) {
        er = e;
      }

      expect(er?.toString().includes(testErrorResponse)).toBe(true);

      expect(tuc.isNoUsers).toHaveBeenCalledTimes(1);
      expect(tuc.addUser).toHaveBeenCalledTimes(0);
    });

    test('If addUser throws an error, an error will propagate to the calling function', async () => {
      const programContext: ProgramContext = {
        userTypeMap: new UserTypeMap,
      };

      const testErrorResponse = 'Test Error 098asdlfkn';

      const ab = new ActionBank();
      const tuc = new TestUserController();

      let er: Error | null = null;

      try {
        const tdc = new TestDataController(
          programContext,
          tuc,
        );

        tuc.isNoUsers.mockImplementationOnce(async () => {
          return true;
        });
        tuc.addUser.mockImplementationOnce(async (user: NewUser) => {
          throw new Error(testErrorResponse);
        });

        await ab.init(tdc, {
          programContext,
        });

      } catch(e) {
        er = e;
      }

      expect(er?.toString().includes(testErrorResponse)).toBe(true);

      expect(tuc.isNoUsers).toHaveBeenCalledTimes(1);
      expect(tuc.addUser).toHaveBeenCalledTimes(1);
    });
  });
});
