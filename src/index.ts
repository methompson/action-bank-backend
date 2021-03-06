// tslint:disable-next-line:no-var-requires
require('module-alias/register');
// tslint:disable-next-line:no-var-requires
// require('dotenv').config();
import * as dotenv from 'dotenv';
dotenv.config();

import Koa from 'koa';
import Router from 'koa-router';
import mount from 'koa-mount';

import koaJWT from "koa-jwt";
import logger from 'koa-logger';
import json from 'koa-json';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';

import { BasicDataController } from '@root/data-controllers';
import { ActionBank } from './action-bank';
import {
  ProgramContext,
  UserTypeMap,
  ActionBankOptions,
} from '@dataTypes';
import MongoDBDataController from './data-controllers/mongodb-controller/mongodb-controller';

/**
 * The app initialization is asynchronous, so we wrap all of our main app
 * logic into an async function and run it immediately.
 */
void async function startApp() {
  const app = new Koa();
  const router = new Router();

  app.use(cors());
  app.use(logger());
  app.use(json());
  app.use(bodyParser());

  const secret = process.env.jwt_secret ?? 'default_secret';
  app.use(koaJWT({secret, passthrough: true}));

  const actionBank = new ActionBank();

  try {
    const programContext: ProgramContext = {
      userTypeMap: new UserTypeMap(),
    };

    const bdc = await BasicDataController.init(
      programContext,
      { 'dataLocation': './data/' },
    );

    const mongoDBController = await MongoDBDataController.init(programContext, {
      username: 'action-bank-root',
      password: 'action-bank-root-password',
      url: 'localhost',
      port: '27017',
    });

    const actionBankOptions: ActionBankOptions = {
      programContext,
    };

    await actionBank.init(mongoDBController, actionBankOptions);
  } catch(e) {
    console.error('Unable to instance data controller', e);
    process.exit(1);
  }

  // Custom 401 handling if you don't want to expose koa-jwt errors to users
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch(err) {
      if (isBadRequestError(err) && err.status === 401) {
        ctx.status = 401;
        ctx.body = {
          error: 'Protected resource. Use Authorization header to gain access',
        };
      } else if (isBadRequestError(err)) {
        // Do something different?
        throw err;
      } else {
        throw err;
      }
    }
  });

  router.get('/',
    async (ctx, next) => {
      ctx.body = {
        msg: 'Welcome to the Action Bank!',
      };

      await next();
    },
  );

  app.use(mount('/api', actionBank.mainApp));

  app
    .use(router.routes())
    .use(router.allowedMethods());

  app.listen(3000, () => {
    console.log('Koa Started');
  });

}();

interface BadRequestError {
  status: number;
  message?: string
}

function isBadRequestError(value: BadRequestError | unknown | undefined): value is BadRequestError {
  const val = value as BadRequestError;

  return val.status !== undefined;
}