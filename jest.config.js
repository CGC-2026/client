module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverageFrom: [
    "helpers/**/*.ts",
    "services/**/*.ts",
    "!**/__tests__/**",
    "!**/node_modules/**",
  ],
  globals: {
    "ts-jest": {
      isolatedModules: true,
    },
  },
};
