import { open, writeFile, mkdir } from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { UserController } from '@root/data-controllers/interfaces';
import BasicDataControllerBase from './basic-controller-base';
import {
  UserExistsException,
  InvalidUsernameException,
  EmailExistsException,
  InvalidUserIdException,
  UserDoesNotExistException,
} from '@root/exceptions/user-exceptions';
import {
  User,
  NewUser,
  ProgramContext,
} from '@dataTypes';


class BasicUserController extends BasicDataControllerBase implements UserController {
  protected _userFileName = 'users.json';
  protected _userWriteLock = false;
  protected _userWriteAgain = false;

  protected _users: Record<number, User> = {};

  constructor(dataLocation: string, programContext: ProgramContext) {
    super(programContext);
    this.dataLocation = dataLocation;
  }

  get users() {
    return this._users;
  }

  async getUsers(pagination: number, page: number): Promise<User[]> {
    const users = Object.values(this.users);

    users.sort((a, b) => {
      const aVal = parseInt(a.id, 10);
      const bVal = parseInt(b.id, 10);

      if (aVal < bVal) {
        return -1;
      }

      if (aVal > bVal) {
        return 1;
      }

      return 0;
    });

    return users;
  }

  protected getUserByEmail(email: string) {
    for (const user of Object.values(this._users)) {
      if (user.email === email) {
        return user;
      }
    }

    return null;
  }

  async getUserByUsername(username: string): Promise<User> {
    for (const user of Object.values(this._users)) {
      if (user.username === username) {
        return user;
      }
    }

    throw new InvalidUsernameException();
  }

  async getUserById(userId: string): Promise<User> {
    const id = parseInt(userId, 10);

    if (Number.isNaN(id)) {
      throw new InvalidUserIdException();
    }

    const user: unknown = this._users[userId];

    if (!(user instanceof User)) {
      throw new InvalidUserIdException();
    }

    return user;
  }

  async addUser(user: NewUser): Promise<User> {
    const containsUser = this.containsUser(user.username, user.email);
    if (containsUser === 'username') {
      throw new UserExistsException();
    } else if (containsUser === 'email') {
      throw new EmailExistsException();
    }

    let id: string;
    // We'll get a unique ID
    do {
      id = uuidv4();
    } while(this.idExists(id, this.users));

    const now = Date.now();

    const u = new User(
      `${id}`,
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

    this._users[id] = u;

    // We don't need to await this.
    void this.writeUserData();

    return u;
  }

  async editUser(user: User): Promise<User> {
    if (!(user.id in this._users)) {
      throw new UserDoesNotExistException();
    }

    // Check if username or email already exist
    const emailUser = this.getUserByEmail(user.email);

    if (emailUser !== null && emailUser?.id !== user.id) {
      throw new EmailExistsException();
    }

    const usernameUser = await this.getUserByUsername(user.username);

    if (usernameUser !== null && usernameUser?.id !== user.id) {
      throw new UserExistsException();
    }

    this._users[user.id] = user;

    void this.writeUserData();

    return user;
  }

  async makePasswordResetToken(userId: string, token: string): Promise<void> {
    let user: User;

    try {
      user = await this.getUserById(userId);
    } catch (e) {
      throw new UserDoesNotExistException();
    }

    user.passwordResetToken = token;
    user.passwordResetDate = Date.now();

    // TODO Save this data
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    let user: User;

    try {
      user = await this.getUserById(userId);
    } catch (e) {
      throw new UserDoesNotExistException();
    }

    user.passwordHash = newPassword;

    // TODO Save this data

    return;
  }

  async deleteUser(id: string): Promise<void> {
    if (!(id in this._users)) {
      throw new Error('User Does Not Exist');
    }

    delete this._users[id];

    void this.writeUserData();
  }

  /**
   * Returns a boolean indicating whether the user list has any users. If there
   * are no users, this function returns true. It returns false otherwise.
   *
   * @returns Promises<boolean>
   */
  async isNoUsers(): Promise<boolean> {
    return Object.keys(this._users).length === 0;
  }

  protected containsUser(username: string, email: string): string | null {
    for (const user of Object.values(this._users)) {
      if (user.username === username) {
        return 'username';
      } else if (user.email === email) {
        return 'email';
      }
    }

    return null;
  }

  async writeUserData(): Promise<void> {
    if (this._userWriteLock === true) {
      console.log("user writelock hit");
      this._userWriteAgain = true;
      return;
    }

    this._userWriteLock = true;

    const userObj: Record<string, unknown> = {};
    Object.values(this._users).forEach((val) => {
      // const user = this._users[key];
      userObj[val.id] = {
        ...val,
        userType: val.userType.name,
      };
    });

    const loc = path.join(this.dataLocation, this._userFileName);
    const handle = await open(loc, 'w+');
    await writeFile(handle, JSON.stringify(userObj));

    await handle.close();
    this._userWriteLock = false;

    if (this._userWriteAgain === true) {
      console.log("write user again");
      this._userWriteAgain = false;
      void this.writeUserData();
    }
  }

  /**
   * This method will read the data from the user file using the user data handle.
   * It will parse the contents of the file and insert the value into the _users variable.
   */
  async readUserData(): Promise<void> {
    await mkdir(this.dataLocation, { recursive: true });

    // We have to use a+ to create the file if it doesn't exist.
    // r will throw an exception if the file doesn't exist.
    // w+ will truncate the file if it already exists.
    const loc = path.join(this.dataLocation, this._userFileName);
    const handle = await open(loc, 'a+');
    const userDataString = await handle.readFile('utf-8');

    void handle.close();

    const rawUserData: unknown = JSON.parse(userDataString);

    if (typeof rawUserData !== 'object' || rawUserData === null) {
      throw new Error('Invalid JSON format');
    }

    // const userData: {[key: string]: User} = {};
    const userData: Record<string, User> = {};

    Object.values(rawUserData).forEach((val) => {
      try {
        const user = User.fromJson(val, this.programContext.userTypeMap);
        userData[user.id] = user;
      } catch(e) {
        console.log();
        // Do nothing
      }
    });

    // const userData = this.parseUserData(rawUserData);

    this._users = userData;
  }
}

export default BasicUserController;