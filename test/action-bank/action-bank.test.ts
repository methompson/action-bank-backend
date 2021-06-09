import { UserTypeMap, ProgramContext, NewUser, User, Deposit, DepositAction, Exchange, NewDeposit, NewDepositAction, NewExchange, NewWithdrawal, NewWithdrawalAction, Withdrawal, WithdrawalAction } from '@dataTypes';
import { ActionBank } from '@root/action-bank';
import { DataController } from '@root/data-controllers';
import { BankController, UserController } from '@root/data-controllers/interfaces/';

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

class TestBankController implements BankController {
  getExchangeById = jest.fn((exchangeId: string): Promise<Exchange> => { throw new Error('Unimplemented'); });
  getExchangesByUserId = jest.fn((userId: string): Promise<Exchange[]> => { throw new Error('Unimplemented'); });
  addExchange = jest.fn((exchange: NewExchange): Promise<Exchange> => { throw new Error('Unimplemented'); });
  editExchange = jest.fn((newExchange: Exchange): Promise<Exchange> => { throw new Error('Unimplemented'); });
  deleteExchange = jest.fn((exchangeId: string): Promise<string> => { throw new Error('Unimplemented'); });
  getDepositActionById = jest.fn((depositActionId: string): Promise<DepositAction> => { throw new Error('Unimplemented'); });
  getDepositActionsByUserId = jest.fn((userId: string): Promise<DepositAction[]> => { throw new Error('Unimplemented'); });
  addDepositAction = jest.fn((action: NewDepositAction): Promise<DepositAction> => { throw new Error('Unimplemented'); });
  editDepositAction = jest.fn((action: DepositAction): Promise<DepositAction> => { throw new Error('Unimplemented'); });
  deleteDepositAction = jest.fn((depositActionId: string): Promise<string> => { throw new Error('Unimplemented'); });
  getWithdrawalActionById = jest.fn((withdrawalId: string): Promise<WithdrawalAction> => { throw new Error('Unimplemented'); });
  getWithdrawalActionsByUserId = jest.fn((userId: string): Promise<WithdrawalAction[]> => { throw new Error('Unimplemented'); });
  addWithdrawalAction = jest.fn((action: NewWithdrawalAction): Promise<WithdrawalAction> => { throw new Error('Unimplemented'); });
  editWithdrawalAction = jest.fn((action: WithdrawalAction): Promise<WithdrawalAction> => { throw new Error('Unimplemented'); });
  deleteWithdrawalAction = jest.fn((withdrawalId: string): Promise<string> => { throw new Error('Unimplemented'); });
  getDepositById = jest.fn((depositId: string): Promise<Deposit> => { throw new Error('Unimplemented'); });
  getDepositsByUserId = jest.fn((userId: string): Promise<Deposit[]> => { throw new Error('Unimplemented'); });
  getDepositsByDepositActionId = jest.fn((depositActionId: string): Promise<Deposit[]> => { throw new Error('Unimplemented'); });
  addDeposit = jest.fn((deposit: NewDeposit): Promise<Deposit> => { throw new Error('Unimplemented'); });
  editDeposit = jest.fn((deposit: Deposit): Promise<Deposit> => { throw new Error('Unimplemented'); });
  deleteDeposit = jest.fn((depositId: string): Promise<string> => { throw new Error('Unimplemented'); });
  getWithdrawalById = jest.fn((withdrawalId: string): Promise<Withdrawal> => { throw new Error('Unimplemented'); });
  getWithdrawalsByUserId = jest.fn((userId: string): Promise<Withdrawal[]> => { throw new Error('Unimplemented'); });
  getWithdrawalsByWithdrawalActionId = jest.fn((withdrawalActionId: string): Promise<Withdrawal[]> => { throw new Error('Unimplemented'); });
  addWithdrawal = jest.fn((withdrawal: NewWithdrawal): Promise<Withdrawal> => { throw new Error('Unimplemented'); });
  editWithdrawal = jest.fn((withdrawal: Withdrawal): Promise<Withdrawal> => { throw new Error('Unimplemented'); });
  deleteWithdrawal = jest.fn((withdrawalId: string): Promise<string> => { throw new Error('Unimplemented'); });
}

describe('ActionBank', () => {
  describe('init', () => {
    test('Given a proper data controller with a user controller that reports isNoUsers is false, ActionBank will initialize without issue', async () => {
      const programContext: ProgramContext = {
        userTypeMap: new UserTypeMap,
      };

      const ab = new ActionBank();
      const tuc = new TestUserController();
      const tbc = new TestBankController();

      let er: Error | null = null;

      try {
        const tdc = new TestDataController(
          programContext,
          tuc,
          tbc,
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
      const tbc = new TestBankController();

      let er: Error | null = null;

      try {
        const tdc = new TestDataController(
          programContext,
          tuc,
          tbc,
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
            now,
            now,
            '',
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
      const tbc = new TestBankController();

      let er: Error | null = null;

      try {
        const tdc = new TestDataController(
          programContext,
          tuc,
          tbc,
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
      const tbc = new TestBankController();

      let er: Error | null = null;

      try {
        const tdc = new TestDataController(
          programContext,
          tuc,
          tbc,
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
