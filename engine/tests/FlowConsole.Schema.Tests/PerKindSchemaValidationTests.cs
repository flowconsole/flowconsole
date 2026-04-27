using System.Text.Json;
using FlowConsole.Schema.SnapshotValidation;
using FluentAssertions;

namespace FlowConsole.Schema.Tests;

/// <summary>
/// Table-driven per-ElementKind conformance tests.
/// Loads fixtures from oss/contracts/model-snapshot/v1/conformance/per-kind/{Kind}/{valid,invalid}.json
/// (shared with validate.mjs — single source of truth for fixtures).
/// </summary>
public class PerKindSchemaValidationTests
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

    // ── Valid fixtures: each ElementKind passes without errors ──────

    [Theory]
    [InlineData("Class")]
    [InlineData("Interface")]
    [InlineData("Endpoint")]
    [InlineData("Function")]
    [InlineData("Producer")]
    [InlineData("Consumer")]
    [InlineData("Service")]
    [InlineData("Application")]
    [InlineData("Module")]
    [InlineData("External")]
    [InlineData("Gateway")]
    [InlineData("Worker")]
    [InlineData("Deployment")]
    [InlineData("Database")]
    [InlineData("Queue")]
    [InlineData("Cache")]
    [InlineData("Ingress")]
    [InlineData("Namespace")]
    [InlineData("Broker")]
    [InlineData("Topic")]
    public void ValidPerKindFixture_PassesWithoutErrors(string kind)
    {
        var diagnostics = ValidateFile($"per-kind/{kind}/valid.json");
        var errors = diagnostics.Where(d => d.Level == DiagnosticLevel.Error).ToList();
        errors.Should().BeEmpty($"valid fixture for {kind} should pass validation");
    }

    // ── Invalid fixtures: per-kind required property missing ───────
    // Kinds with per-kind required properties produce SNAPSHOT_SCHEMA_KIND_PROPERTIES_REQUIRED_MISSING.
    // Kinds without per-kind required properties have missing "name" → SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD.

    [Theory]
    [InlineData("Endpoint", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_KIND_PROPERTIES_REQUIRED_MISSING, "/elements/0")]
    [InlineData("Topic", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_KIND_PROPERTIES_REQUIRED_MISSING, "/elements/0")]
    [InlineData("Ingress", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_KIND_PROPERTIES_REQUIRED_MISSING, "/elements/0")]
    [InlineData("Class", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Interface", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Function", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Producer", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Consumer", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Service", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Application", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Module", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("External", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Gateway", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Worker", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Deployment", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Database", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Queue", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Cache", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Namespace", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    [InlineData("Broker", SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD, "/elements/0")]
    public void InvalidPerKindFixture_ProducesExpectedDiagnostic(string kind, string expectedCode, string expectedPath)
    {
        var diagnostics = ValidateFile($"per-kind/{kind}/invalid.json");
        diagnostics.Should().Contain(
            d => d.Code == expectedCode && d.Path == expectedPath,
            $"invalid fixture for {kind} should produce {expectedCode} at {expectedPath}");
    }

    [Fact]
    public void AllElementKinds_HavePerKindFixtures()
    {
        var expectedKinds = new[]
        {
            "Class", "Interface", "Endpoint", "Function", "Producer", "Consumer",
            "Service", "Application", "Module", "External", "Gateway", "Worker",
            "Deployment", "Database", "Queue", "Cache", "Ingress", "Namespace", "Broker", "Topic"
        };

        var perKindDir = Path.Combine(ConformanceDir, "per-kind");
        foreach (var kind in expectedKinds)
        {
            var validPath = Path.Combine(perKindDir, kind, "valid.json");
            var invalidPath = Path.Combine(perKindDir, kind, "invalid.json");
            File.Exists(validPath).Should().BeTrue($"valid fixture for {kind} should exist at {validPath}");
            File.Exists(invalidPath).Should().BeTrue($"invalid fixture for {kind} should exist at {invalidPath}");
        }
    }

    // ── Verify no duplicate fixtures (files in per-kind/ are the single source) ──

    [Fact]
    public void PerKindFixtures_AreNotDuplicatedElsewhere()
    {
        var perKindDir = Path.Combine(ConformanceDir, "per-kind");
        var perKindFiles = Directory.GetFiles(perKindDir, "*.json", SearchOption.AllDirectories);
        perKindFiles.Length.Should().BeGreaterThanOrEqualTo(40,
            "should have at least 20 valid + 20 invalid fixtures");
    }
}
