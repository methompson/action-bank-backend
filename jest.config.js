module.exports = {
  verbose: true,
  moduleNameMapper: {
    '@root/(.*)': '<rootDir>/src/$1',
    '@dataTypes(.*)': '<rootDir>/src/data-types$1',
  },
};

// module.exports = {
//   roots: ['<rootDir>/src'],
//   testMatch: [
//     "**/__tests__/**/*.+(ts|tsx|js)",
//     "**/?(*.)+(spec|test).+(ts|tsx|js)"
//   ],
//   transform: {
//     "^.+\\.(ts|tsx)$": "ts-jest"
//   },
// }