import { Collection, MongoClient } from 'mongodb';

import { User, NewUser, ProgramContext } from '@dataTypes';
import { UserController } from '@root/data-controllers/interfaces';

class MongoDBUserController implements UserController {
  constructor(
    protected programContext: ProgramContext,
    protected client: MongoClient,
  ) {}

  get collection(): Collection {
    return this.client.db('action-bank').collection('users');
  }

  async getUserByUsername(username: string): Promise<User> { throw new Error('Unimplemented'); }

  async getUserById(userId: string): Promise<User> { throw new Error('Unimplemented'); }

  async getUsers(pagination: number, page: number): Promise<User[]> { throw new Error('Unimplemented'); }

  async addUser(user: NewUser): Promise<User> {
    const result = await this.collection.insertOne(user.toJSON());

    const id = result.insertedId;

    const newUser = User.fromNewUser(user, id.toString());

    return newUser;
  }

  async editUser(user: User): Promise<User> { throw new Error('Unimplemented'); }

  async makePasswordResetToken(userId: string, token: string): Promise<void> { throw new Error('Unimplemented'); }

  async updatePassword(userId: string, newPassword: string): Promise<void> { throw new Error('Unimplemented'); }

  async deleteUser(id: string): Promise<void> { throw new Error('Unimplemented'); }

  async isNoUsers(): Promise<boolean> {
    const result = await this.collection.find().toArray();

    return result.length === 0;
  }
}

export default MongoDBUserController;