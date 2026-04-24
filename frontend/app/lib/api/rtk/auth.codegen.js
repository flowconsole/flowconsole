const { createCodegenConfig } = require("./create-codegen-config");

module.exports = createCodegenConfig({
  exportName: "authGeneratedApi",
  outputFile: "./auth.generated.ts",
  operationIds: [
    "Register",
    "Login",
    "RefreshToken",
    "GetCurrentUser",
    "UpdateCurrentUser",
  ],
});
