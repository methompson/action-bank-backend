import { MongoClient } from 'mongodb';

import {
  BankController,
  DataController,
  UserController,
} from '@root/data-controllers/interfaces/';
import { ProgramContext } from '@dataTypes';
import MongoDBOptions from './mongodb-options';
import MongoDBUserController from './mongodb-user-controller';
import MongoDBBankController from './mongodb-bank-controller';
import { isRecord, isString } from '@dataTypes/type-guards';

class MongoDBDataController extends DataController {
  constructor(
    programContext: ProgramContext,
    userController: UserController,
    bankController: BankController,
    private client: MongoClient,
    protected mongoDBOptions: MongoDBOptions,
  ) {
    super(programContext, userController, bankController);
  }

  static async init(programContext: ProgramContext, options?: Record<string, unknown>): Promise<DataController> {
    if (!isMongoDBOptions(options)) {
      throw new Error('Invalid MongoDB Options Parameter');
    }

    const mongoDBUri = `mongodb://${options.username}:${options.password}@${options.url}:${options.port}`;
    const client = new MongoClient(mongoDBUri, {
      useUnifiedTopology: true,
    });

    await client.connect();

    const collections = await client.db('action-bank').collections();

    let containsUsers = false;
    collections.forEach((col) => {
      if (col.collectionName === 'users') containsUsers = true;
    });

    if (!containsUsers) {
      // Enforce required values
      var userCollection = await client.db('action-bank').createCollection('users', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['username', 'passwordHash', 'email', 'enabled'],
            properties: {
              username: {
                bsonType: 'string',
                description: 'username is required and must be a string',
              },
              passwordHash: {
                bsonType: 'string',
                description: 'passwordHash is required and must be a string',
              },
              email: {
                bsonType: 'string',
                description: 'email is required and must be a string',
              },
              enabled: {
                bsonType: 'bool',
                description: 'enabled is required and must be a boolean',
              },
            },
          },
        },
      });

      // Enforce uniqueness
      await userCollection.createIndex({username: 1, email: 1}, {unique: true});
    }

    const userController = new MongoDBUserController(programContext, client);
    const bankController = new MongoDBBankController(programContext, client);

    return new MongoDBDataController(
      programContext,
      userController,
      bankController,
      client,
      options,
    );
  }
}

function isMongoDBOptions(value: MongoDBOptions | Record<string, unknown> | unknown | null | undefined ): value is MongoDBOptions {
  if (!isRecord(value)
    || !isString(value.username)
    || !isString(value.password)
    || !isString(value.url)
    || !isString(value.port)
  ) { return false; }

  return true;
}

export default MongoDBDataController;
