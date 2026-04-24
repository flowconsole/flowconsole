const { createCodegenConfig } = require("./create-codegen-config");

module.exports = createCodegenConfig({
  exportName: "graphGeneratedApi",
  outputFile: "./graph.generated.ts",
  operationIds: [
    "ListElements",
    "GetElement",
    "ListRelationships",
    "GetRelationship",
    "ListCanonicalMappings",
    "UpdateCanonicalMappings",
    "GetSharedModel",
  ],
});
