using System.Text.Json;
using FlowConsole.Schema.SnapshotValidation;
using FluentAssertions;

namespace FlowConsole.Schema.Tests;

/// <summary>
/// Unit tests for JsonSchemaValidator with flow-related fixtures (schema 1.1.0).
/// Covers schema-level shape validation only; semantic validation is in Task 5.
/// </summary>
public class JsonSchemaValidatorFlowTests
{
    private static readonly string ConformanceDir = FindConformanceDir();
    private readonly JsonSchemaValidator _validator = new();

    private static string FindConformanceDir()
    {
        var dir = AppContext.BaseDirectory;
        while (dir is not null)
        {
            var candidate = Path.Combine(dir, "contracts", "model-snapshot", "v1", "conformance");
            if (Directory.Exists(candidate)) return candidate;

            candidate = Path.Combine(dir, "oss", "contracts", "model-snapshot", "v1", "conformance");
            if (Directory.Exists(candidate)) return candidate;

            dir = Path.GetDirectoryName(dir);
        }
        throw new InvalidOperationException("Cannot find conformance directory");
    }

    private IReadOnlyList<SchemaDiagnostic> ValidateFile(string relativePath)
    {
        var fullPath = Path.Combine(ConformanceDir, relativePath);
        var json = File.ReadAllText(fullPath);
        using var doc = JsonDocument.Parse(json);
        var result = _validator.Validate(doc);
        result.IsSuccess.Should().BeTrue();
        return result.Value;
    }

    private static IReadOnlyList<SchemaDiagnostic> ValidateJson(string json)
    {
        var validator = new JsonSchemaValidator();
        using var doc = JsonDocument.Parse(json);
        var result = validator.Validate(doc);
        result.IsSuccess.Should().BeTrue();
        return result.Value;
    }

    [Fact]
    public void WithFlows_PassesWithoutErrors()
    {
        var diagnostics = ValidateFile("valid/with-flows.json");
        var errors = diagnostics.Where(d => d.Level == DiagnosticLevel.Error).ToList();
        errors.Should().BeEmpty("with-flows.json should pass schema validation");
    }

    [Fact]
    public void WithActionSteps_PassesWithoutErrors()
    {
        var diagnostics = ValidateFile("valid/with-action-steps.json");
        var errors = diagnostics.Where(d => d.Level == DiagnosticLevel.Error).ToList();
        errors.Should().BeEmpty("with-action-steps.json (RelationshipId=null) should pass schema validation");
    }

    [Fact]
    public void EmptyFlows_PassesWithoutErrors()
    {
        var diagnostics = ValidateFile("valid/empty-flows.json");
        var errors = diagnostics.Where(d => d.Level == DiagnosticLevel.Error).ToList();
        errors.Should().BeEmpty("empty flows array should pass schema validation");
    }

    [Fact]
    public void MissingFlowsProperty_PassesWithoutErrors()
    {
        // Legacy 1.0.0 payload without flows property — backward compat
        var json = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.1.0",
          "source": "CodeScan",
          "elements": [{"id":"svc","kind":"Service","name":"A"}],
          "relationships": []
        }
        """;
        var diagnostics = ValidateJson(json);
        var errors = diagnostics.Where(d => d.Level == DiagnosticLevel.Error).ToList();
        errors.Should().BeEmpty("missing flows property should be accepted (nullable)");
    }

    // ── Invalid flow fixtures — schema passes (semantic catches later) ──

    [Fact]
    public void FlowDuplicateId_SchemaPassesBecauseJsonSchemaCannotCheckUniqueness()
    {
        // JSON Schema cannot validate uniqueness by a property value;
        // this is caught by the semantic FlowValidator in Task 5
        var diagnostics = ValidateFile("invalid/flow-duplicate-id.json");
        var errors = diagnostics.Where(d => d.Level == DiagnosticLevel.Error).ToList();
        errors.Should().BeEmpty("duplicate flow id cannot be caught by JSON Schema — semantic validator handles it");
    }

    // Regression: cli-test users hit fcon view reporting
    //   [SNAPSHOT_SCHEMA_INVALID_TYPE] /flows/N/steps/M/relationshipId:
    //     Value is "string" but should be "null"
    // for steps whose relationshipId is a valid Identifier string.
    // Root cause: relationshipId schema is oneOf [Identifier, null]; when the
    // snapshot has an unrelated error elsewhere (here: flow.id with spaces),
    // JsonSchema.Net's OutputFormat.List exposes the failed null-branch detail
    // even though the oneOf overall passed. The validator must drop those
    // phantom errors from passing oneOf branches.
    [Fact]
    public void RelationshipIdAsValidIdentifier_DoesNotLeakNullBranchError()
    {
        var json = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.1.0",
          "source": "Git",
          "elements": [
            {"id":"customer","kind":"External","name":"Customer"},
            {"id":"webapp","kind":"Application","name":"WebApp"},
            {"id":"basket-api","kind":"Application","name":"Basket.API"}
          ],
          "relationships": [
            {"id":"customer_calls_webapp","kind":"Calls","sourceId":"customer","targetId":"webapp"},
            {"id":"webapp_calls_basket-api","kind":"Calls","sourceId":"webapp","targetId":"basket-api"}
          ],
          "flows": [
            {
              "id": "Add to basket",
              "name": "Add to basket",
              "steps": [
                {"sourceElementId":"customer","relationshipId":"customer_calls_webapp","label":"add to basket"},
                {"sourceElementId":"webapp","relationshipId":"webapp_calls_basket-api","label":"POST /api/v1/basket"}
              ]
            }
          ]
        }
        """;

        var diagnostics = ValidateJson(json);
        var errors = diagnostics.Where(d => d.Level == DiagnosticLevel.Error).ToList();

        errors.Should().Contain(d => d.Path == "/flows/0/id",
            "the invalid flow.id with spaces is the real error");

        errors.Should().NotContain(
            d => d.Path.EndsWith("/relationshipId", StringComparison.Ordinal),
            "relationshipId values are valid Identifier strings; the failed null branch of oneOf must not be reported");
    }
}
