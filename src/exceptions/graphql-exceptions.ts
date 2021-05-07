import { ApolloError } from 'apollo-server-errors';

class MutateDataException extends ApolloError {
  constructor(message: string) {
    super(message, 'MUTATE_DATA_EXCEPTION');

    Object.defineProperty(this, 'name', { value: 'MutateDataException' });
    Object.setPrototypeOf(this, MutateDataException.prototype);
  }
}

class QueryDataException extends ApolloError {
  constructor(message: string) {
    super(message, 'Query_DATA_EXCEPTION');

    Object.defineProperty(this, 'name', { value: 'QueryDataException' });
    Object.setPrototypeOf(this, QueryDataException.prototype);
  }
}

export {
  MutateDataException,
  QueryDataException,
};