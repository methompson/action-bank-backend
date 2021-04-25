// tslint:disable:max-classes-per-file

class InvalidResultException extends Error {
  constructor(...params) {
    super(...params);

    Object.setPrototypeOf(this, InvalidResultException.prototype);
  }
}

class InvalidJSONException extends Error {
  constructor(...params) {
    super(...params);

    Object.setPrototypeOf(this, InvalidJSONException.prototype);
  }
}

export {
  InvalidResultException,
  InvalidJSONException,
};