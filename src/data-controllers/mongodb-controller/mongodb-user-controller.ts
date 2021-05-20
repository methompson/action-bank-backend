import { Collection, MongoClient, ObjectId } from 'mongodb';

import { User, NewUser, ProgramContext } from '@dataTypes';
import { UserController } from '@root/data-controllers/interfaces';
import { isRecord } from '@dataTypes/type-guards';

class MongoDBUserController implements UserController {
  constructor(
    protected programContext: ProgramContext,
    protected client: MongoClient,
  ) {}

  get collection(): Collection {
    return this.client.db('action-bank').collection('users');
  }

  async getUserByUsername(username: string): Promise<User> {
    const result = await this.collection.findOne({
      username: username,
    });

    const id = result._id.toString();

    const user = User.fromJSON({
      ...result,
      id,
    }, this.programContext.userTypeMap);

    return user;
  }

  async getUserById(userId: string): Promise<User> {
    const _userId = new ObjectId(userId);
    const result = await this.collection.findOne({
      _id: _userId,
    });

    const user = User.fromJSON(result, this.programContext.userTypeMap);

    return user;
  }

  async getUsers(pagination: number, page: number): Promise<User[]> {
    const skip = pagination * (page - 1);
    const results = await this.collection.find().skip(skip).limit(pagination).toArray();

    const users: User[] = [];;

    results.forEach((result) => {
      try {
        const id = result._id.toString();
        const u = User.fromJSON({
          ...result,
          id,
        }, this.programContext.userTypeMap);
        users.push(u);
      } catch (e) {}
    });

    return users;
  }

  async addUser(newUser: NewUser): Promise<User> {
    const result = await this.collection.insertOne(newUser.toJSON());

    const id = result.insertedId;

    const savedUser = User.fromNewUser(newUser, id.toString());

    return savedUser;
  }

  async editUser(user: User): Promise<User> {
    const _id = new ObjectId(user.id);
    const result = await this.collection.updateOne(
      { _id: _id },
      { $set: user.toJSON() },
      { upsert: false },
    );

    return user;
  }

  async makePasswordResetToken(userId: string, token: string): Promise<void> { throw new Error('Unimplemented'); }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    const _id = new ObjectId(userId);
    const result = await this.collection.updateOne(
      { _id: _id },
      {
        $set: { passwordHash: newPasswordHash },
      },
      { upsert: false },
    );
   }

  async deleteUser(userId: string): Promise<void> {
    const _id = new ObjectId(userId);

    await this.collection.deleteOne({ _id, });
  }

  async isNoUsers(): Promise<boolean> {
    const result = await this.collection.find().toArray();

    return result.length === 0;
  }
}

export default MongoDBUserController;