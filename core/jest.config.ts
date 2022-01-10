/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'v8',

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '^rxjs/internal(.*)$': '<rootDir>/node_modules/rxjs/dist/cjs/internal$1',
  },

  // A preset that is used as a base for Jest's configuration
  preset: 'ts-jest',
}
