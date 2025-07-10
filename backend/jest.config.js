module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "js"],
  transform: { 
    "^.+\\.ts$": ["ts-jest", {
      diagnostics: { ignoreCodes: [2322, 2339, 2345] }
    }]
  },
  testMatch: ["**/tests/**/*.test.ts", "**/tests/**/*.api.test.ts"],
  transformIgnorePatterns: ["<rootDir>/node_modules/"],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
  clearMocks: true
};