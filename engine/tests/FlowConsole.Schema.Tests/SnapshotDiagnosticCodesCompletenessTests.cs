using System.Reflection;
using System.Text.RegularExpressions;
using FlowConsole.Schema.SnapshotValidation;
using FluentAssertions;

namespace FlowConsole.Schema.Tests;

/// <summary>
/// Drift test: ensures all SNAPSHOT_* codes in diagnostics.md have corresponding
/// constants in SnapshotDiagnosticCodes, and vice versa.
/// </summary>
public partial class SnapshotDiagnosticCodesCompletenessTests
{
    private static readonly string DiagnosticsMdPath = FindDiagnosticsMd();

    private static string FindDiagnosticsMd()
    {
        var dir = AppContext.BaseDirectory;
        while (dir is not null)
        {
            var candidate = Path.Combine(dir, "contracts", "model-snapshot", "v1", "diagnostics.md");
            if (File.Exists(candidate)) return candidate;

            candidate = Path.Combine(dir, "oss", "contracts", "model-snapshot", "v1", "diagnostics.md");
            if (File.Exists(candidate)) return candidate;

            dir = Path.GetDirectoryName(dir);
        }
        throw new InvalidOperationException("Cannot find diagnostics.md");
    }

    [Fact]
    public void AllCodesInDiagnosticsMd_HaveConstantInSnapshotDiagnosticCodes()
    {
        var mdCodes = ExtractCodesFromMarkdown();
        var csCodes = ExtractCodesFromClass();

        mdCodes.Should().NotBeEmpty("diagnostics.md should contain SNAPSHOT_* codes");
        csCodes.Should().NotBeEmpty("SnapshotDiagnosticCodes should contain constants");

        // Every code in diagnostics.md should have a constant
        foreach (var code in mdCodes)
        {
            csCodes.Should().Contain(code,
                $"code '{code}' exists in diagnostics.md but is missing from SnapshotDiagnosticCodes");
        }

        // Every constant should be in diagnostics.md
        foreach (var code in csCodes)
        {
            mdCodes.Should().Contain(code,
                $"constant '{code}' exists in SnapshotDiagnosticCodes but is missing from diagnostics.md");
        }
    }

    [Fact]
    public void CodeSets_AreExactlyEqual()
    {
        var mdCodes = ExtractCodesFromMarkdown();
        var csCodes = ExtractCodesFromClass();

        csCodes.Should().BeEquivalentTo(mdCodes,
            "SnapshotDiagnosticCodes constants and diagnostics.md codes must be in exact parity");
    }

    private static HashSet<string> ExtractCodesFromMarkdown()
    {
        var content = File.ReadAllText(DiagnosticsMdPath);
        var regex = SnapshotCodePattern();
        var matches = regex.Matches(content);
        // Only keep codes that match the full constant pattern (at least 3 segments: SNAPSHOT_PHASE_CODE)
        return matches
            .Select(m => m.Value)
            .Where(v => v.Count(c => c == '_') >= 2 && !v.EndsWith('_'))
            .ToHashSet(StringComparer.Ordinal);
    }

    private static HashSet<string> ExtractCodesFromClass()
    {
        var fields = typeof(SnapshotDiagnosticCodes)
            .GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.DeclaredOnly)
            .Where(f => f.IsLiteral && f.FieldType == typeof(string));

        return fields
            .Select(f => (string)f.GetRawConstantValue()!)
            .ToHashSet(StringComparer.Ordinal);
    }

    [GeneratedRegex(@"SNAPSHOT_[A-Z_]+")]
    private static partial Regex SnapshotCodePattern();
}
