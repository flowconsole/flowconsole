using System.Text.Json;
using FlowConsole.Schema.SnapshotValidation;
using FluentAssertions;

namespace FlowConsole.Schema.Tests;

public class JsonSchemaValidatorTests
{
    private static readonly string ConformanceDir = FindConformanceDir();
    private readonly JsonSchemaValidator _validator = new();

    private static string FindConformanceDir()
    {
        // Walk up from test output dir to repo root, then into contracts
        var dir = AppContext.BaseDirectory;
        while (dir is not null)
        {
            var candidate = Path.Combine(dir, "contracts", "model-snapshot", "v1", "conformance");
            if (Directory.Exists(candidate)) return candidate;

            // Also check if we're in oss/engine/...
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

    [Theory]
    [InlineData("valid/minimal.json")]
    [InlineData("valid/multi-kind.json")]
    [InlineData("valid/with-versioning.json")]
    [InlineData("valid/multi-source.json")]
    [InlineData("valid/with-hierarchy.json")]
    [InlineData("valid/empty-collections.json")]
    public void ValidFixtures_PassWithoutErrors(string fixture)
    {
        var diagnostics = ValidateFile(fixture);
        var errors = diagnostics.Where(d => d.Level == DiagnosticLevel.Error).ToList();
        errors.Should().BeEmpty($"fixture {fixture} should pass validation");
    }

    // ── Invalid fixtures — code matching ─────────────────────────────

    [Theory]
    [InlineData("invalid/missing-schema-field.json", "SNAPSHOT_SCHEMA_FIELD_MISSING")]
    [InlineData("invalid/missing-version.json", "SNAPSHOT_VERSION_MISSING")]
    [InlineData("invalid/major-version-mismatch.json", "SNAPSHOT_VERSION_MAJOR_MISMATCH")]
    [InlineData("invalid/unknown-kind.json", "SNAPSHOT_SCHEMA_KIND_DISCRIMINATOR_INVALID")]
    [InlineData("invalid/endpoint-missing-http-method.json", "SNAPSHOT_SCHEMA_KIND_PROPERTIES_REQUIRED_MISSING")]
    [InlineData("invalid/topic-missing-partitions.json", "SNAPSHOT_SCHEMA_KIND_PROPERTIES_REQUIRED_MISSING")]
    [InlineData("invalid/unknown-field.json", "SNAPSHOT_SCHEMA_UNKNOWN_FIELD")]
    [InlineData("invalid/invalid-type-elements.json", "SNAPSHOT_SCHEMA_INVALID_TYPE")]
    [InlineData("invalid/missing-required-element-fields.json", "SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD")]
    [InlineData("invalid/invalid-enum-relation-kind.json", "SNAPSHOT_SCHEMA_INVALID_ENUM_VALUE")]
    [InlineData("invalid/duplicate-element-id.json", "SNAPSHOT_REF_DUPLICATE_ID")]
    [InlineData("invalid/relationship-target-missing.json", "SNAPSHOT_REF_UNRESOLVED")]
    public void InvalidFixtures_ProduceExpectedCode(string fixture, string expectedCode)
    {
        var diagnostics = ValidateFile(fixture);
        diagnostics.Should().Contain(d => d.Code == expectedCode,
            $"fixture {fixture} should produce diagnostic code {expectedCode}");
    }

    [Fact]
    public void PatchVersion_PassesSilently()
    {
        var json = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.0.5",
          "source": "CodeScan",
          "elements": [],
          "relationships": []
        }
        """;
        var diagnostics = ValidateJson(json);
        diagnostics.Should().BeEmpty("patch version differences should be silent");
    }

    [Fact]
    public void MinorAhead_ProducesWarning()
    {
        var json = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.3.0",
          "source": "CodeScan",
          "elements": [],
          "relationships": []
        }
        """;
        var diagnostics = ValidateJson(json);
        diagnostics.Should().ContainSingle(d =>
            d.Code == SnapshotDiagnosticCodes.SNAPSHOT_VERSION_MINOR_AHEAD &&
            d.Level == DiagnosticLevel.Warning);
    }

    [Fact]
    public void MajorMismatch_ProducesError()
    {
        var json = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "2.0.0",
          "source": "CodeScan",
          "elements": [],
          "relationships": []
        }
        """;
        var diagnostics = ValidateJson(json);
        diagnostics.Should().Contain(d =>
            d.Code == SnapshotDiagnosticCodes.SNAPSHOT_VERSION_MAJOR_MISMATCH &&
            d.Level == DiagnosticLevel.Error);
    }

    [Fact]
    public void MissingSchemaField_ProducesFieldMissing()
    {
        var json = """
        {
          "schemaVersion": "1.0.0",
          "source": "CodeScan",
          "elements": [],
          "relationships": []
        }
        """;
        var diagnostics = ValidateJson(json);
        diagnostics.Should().Contain(d =>
            d.Code == SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_FIELD_MISSING);
    }

    [Fact]
    public void MissingSchemaVersion_ProducesVersionMissing()
    {
        var json = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "source": "CodeScan",
          "elements": [],
          "relationships": []
        }
        """;
        var diagnostics = ValidateJson(json);
        diagnostics.Should().Contain(d =>
            d.Code == SnapshotDiagnosticCodes.SNAPSHOT_VERSION_MISSING);
    }

    [Fact]
    public void InvalidKind_ProducesKindDiscriminatorInvalid()
    {
        var json = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.0.0",
          "source": "CodeScan",
          "elements": [{"id":"x","kind":"Microservice","name":"Test"}],
          "relationships": []
        }
        """;
        var diagnostics = ValidateJson(json);
        diagnostics.Should().Contain(d =>
            d.Code == SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_KIND_DISCRIMINATOR_INVALID);
    }

    [Fact]
    public void EndpointMissingHttpMethod_ProducesPerKindRequired()
    {
        var json = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.0.0",
          "source": "CodeScan",
          "elements": [{"id":"ep-1","kind":"Endpoint","name":"GET /users"}],
          "relationships": []
        }
        """;
        var diagnostics = ValidateJson(json);
        diagnostics.Should().Contain(d =>
            d.Code == SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_KIND_PROPERTIES_REQUIRED_MISSING);
    }

    [Fact]
    public void DuplicateElementId_ProducesDuplicateRef()
    {
        var json = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.0.0",
          "source": "CodeScan",
          "elements": [
            {"id":"svc-1","kind":"Service","name":"A"},
            {"id":"svc-1","kind":"Service","name":"B"}
          ],
          "relationships": []
        }
        """;
        var diagnostics = ValidateJson(json);
        diagnostics.Should().Contain(d =>
            d.Code == SnapshotDiagnosticCodes.SNAPSHOT_REF_DUPLICATE_ID);
    }

    [Fact]
    public void UnresolvedTarget_ProducesRefUnresolved()
    {
        var json = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.0.0",
          "source": "CodeScan",
          "elements": [{"id":"svc-1","kind":"Service","name":"A"}],
          "relationships": [{"id":"r-1","sourceId":"svc-1","targetId":"non-existent","kind":"Calls"}]
        }
        """;
        var diagnostics = ValidateJson(json);
        diagnostics.Should().Contain(d =>
            d.Code == SnapshotDiagnosticCodes.SNAPSHOT_REF_UNRESOLVED &&
            d.Path == "/relationships/0/targetId");
    }

    [Theory]
    [InlineData(SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_FIELD_MISSING, "schema")]
    [InlineData(SnapshotDiagnosticCodes.SNAPSHOT_VERSION_MISSING, "version")]
    [InlineData(SnapshotDiagnosticCodes.SNAPSHOT_REF_DUPLICATE_ID, "reference")]
    [InlineData(SnapshotDiagnosticCodes.SNAPSHOT_LIMIT_BODY_TOO_LARGE, "limit")]
    public void SchemaDiagnostic_Phase_DerivedFromCodePrefix(string code, string expectedPhase)
    {
        var diag = new SchemaDiagnostic(code, DiagnosticLevel.Error, "/", "test");
        diag.Phase.Should().Be(expectedPhase);
    }

    // ── Valid v1.0.0 snapshot passes without diagnostics ─────────────

    [Fact]
    public void ValidSnapshot_NoDiagnostics()
    {
        var json = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.0.0",
          "source": "CodeScan",
          "elements": [
            {"id":"svc","kind":"Service","name":"My Service"}
          ],
          "relationships": []
        }
        """;
        var diagnostics = ValidateJson(json);
        diagnostics.Should().BeEmpty();
    }
}
