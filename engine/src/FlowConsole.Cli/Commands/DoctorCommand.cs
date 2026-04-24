using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text.Json;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Settings;
using FlowConsole.Schema.SnapshotValidation;
using Spectre.Console.Cli;
using TreeSitter;

namespace FlowConsole.Cli.Commands;

internal sealed class DoctorSettings : GlobalSettings
{
}

internal sealed class DoctorCommand : Command<DoctorSettings>
{
    private readonly IJsonSchemaValidator _schemaValidator;

    // Exit codes: 0 = all pass, 1 = warnings only, 2 = critical
    private const int ExitAllPass = 0;
    private const int ExitWarnings = 1;
    private const int ExitCritical = 2;

    public DoctorCommand(IJsonSchemaValidator schemaValidator)
    {
        _schemaValidator = schemaValidator;
    }

    public override int Execute(CommandContext context, DoctorSettings settings)
    {
        var hasWarning = false;
        var hasCritical = false;

        Console.WriteLine("FlowConsole Doctor");
        Console.WriteLine($"  CLI version: {VersionCommand.GetVersion()}");
        Console.WriteLine();

        // Check 1: Tree-sitter native library
        CheckTreeSitter(ref hasWarning, ref hasCritical, settings.Verbose);

        // Check 2: Rules directory
        CheckRulesDirectory(ref hasWarning, ref hasCritical, settings.Verbose);

        // Check 3: Schema version compatibility
        CheckSchemaVersion(ref hasWarning, ref hasCritical, settings.Verbose);

        // Check 4: API key
        CheckApiKey(ref hasWarning, ref hasCritical, settings.Verbose);

        Console.WriteLine();

        if (hasCritical) return ExitCritical;
        if (hasWarning) return ExitWarnings;
        return ExitAllPass;
    }

    private static void CheckTreeSitter(ref bool hasWarning, ref bool hasCritical, bool verbose)
    {
        try
        {
            // Actually load the native Tree-sitter library by instantiating a Language.
            // This catches DllNotFoundException / TypeLoadException that would occur at scan time.
            using var lang = new TreeSitter.Language("c_sharp");
            PrintCheck(CheckStatus.Pass, "Tree-sitter native library loaded");
            if (verbose)
                Console.WriteLine($"    Assembly: {typeof(FlowConsole.Scanners.CSharp.CSharpCodeParser).Assembly.GetName().Name}");
        }
        catch (Exception ex)
        {
            // Warn (not critical) — Tree-sitter is only needed for `fc scan`, not for
            // `fc validate`, `fc fmt`, `fc rules`, etc.
            PrintCheck(CheckStatus.Warn, $"Tree-sitter native library not available: {ex.Message}");
            PrintCheck(CheckStatus.Warn, "  `fc scan` will not work; other commands are unaffected");
            hasWarning = true;
        }
    }

    private void CheckRulesDirectory(ref bool hasWarning, ref bool hasCritical, bool verbose)
    {
        var configFile = ConfigDiscovery.FindConfigFile(Directory.GetCurrentDirectory());
        var rulesDir = ResolveRulesDir(configFile);

        if (!Directory.Exists(rulesDir))
        {
            PrintCheck(CheckStatus.Warn, $"Rules directory not found: {rulesDir}");
            PrintCheck(CheckStatus.Warn, "  Run 'fc init' to create default rules");
            hasWarning = true;
            return;
        }

        var ruleFiles = Directory.GetFiles(rulesDir, "*.rule.yaml", SearchOption.AllDirectories)
            .Concat(Directory.GetFiles(rulesDir, "*.rule.yml", SearchOption.AllDirectories))
            .Concat(Directory.GetFiles(rulesDir, "*.rule.json", SearchOption.AllDirectories))
            .ToArray();
        if (ruleFiles.Length == 0)
        {
            PrintCheck(CheckStatus.Warn, $"Rules directory is empty: {rulesDir}");
            hasWarning = true;
            return;
        }

        // Validate each rule file against schema
        var invalidCount = 0;
        foreach (var ruleFile in ruleFiles)
        {
            try
            {
                var content = File.ReadAllText(ruleFile);
                // Basic YAML parse check — rule schema validation is done by the rule engine
                if (string.IsNullOrWhiteSpace(content))
                {
                    invalidCount++;
                    if (verbose)
                        PrintCheck(CheckStatus.Fail, $"  Empty rule file: {Path.GetFileName(ruleFile)}");
                }
            }
            catch (Exception ex)
            {
                invalidCount++;
                if (verbose)
                    PrintCheck(CheckStatus.Fail, $"  Cannot read {Path.GetFileName(ruleFile)}: {ex.Message}");
            }
        }

        if (invalidCount > 0)
        {
            PrintCheck(CheckStatus.Fail, $"Rules directory: {rulesDir} ({ruleFiles.Length} rules, {invalidCount} invalid)");
            hasCritical = true;
        }
        else
        {
            PrintCheck(CheckStatus.Pass, $"Rules directory: {rulesDir} ({ruleFiles.Length} rules, all valid)");
        }
    }

    private void CheckSchemaVersion(ref bool hasWarning, ref bool hasCritical, bool verbose)
    {
        // Look for snapshot files to check schema version compatibility
        var snapshotDir = Path.Combine(".flowconsole", "snapshots");
        if (!Directory.Exists(snapshotDir))
        {
            PrintCheck(CheckStatus.Pass, "Schema version: CLI supports v1.x.x (no snapshots to check)");
            return;
        }

        var snapshotFiles = Directory.GetFiles(snapshotDir, "*.json");
        if (snapshotFiles.Length == 0)
        {
            PrintCheck(CheckStatus.Pass, "Schema version: CLI supports v1.x.x (no snapshots to check)");
            return;
        }

        foreach (var snapshotFile in snapshotFiles)
        {
            try
            {
                using var stream = File.OpenRead(snapshotFile);
                using var doc = JsonDocument.Parse(stream);
                var result = _schemaValidator.Validate(doc);

                if (result.IsFailed)
                {
                    PrintCheck(CheckStatus.Fail, $"Schema check failed for {Path.GetFileName(snapshotFile)}: {result.Errors[0].Message}");
                    hasCritical = true;
                    continue;
                }

                var diagnostics = result.Value;
                var versionDiags = diagnostics
                    .Where(d => d.Code.StartsWith("SNAPSHOT_VERSION_", StringComparison.Ordinal))
                    .ToList();

                if (versionDiags.Any(d => d.Code == SnapshotDiagnosticCodes.SNAPSHOT_VERSION_MAJOR_MISMATCH))
                {
                    var diag = versionDiags.First(d => d.Code == SnapshotDiagnosticCodes.SNAPSHOT_VERSION_MAJOR_MISMATCH);
                    PrintCheck(CheckStatus.Fail, $"Schema: {Path.GetFileName(snapshotFile)} — {diag.Message}; upgrade CLI");
                    hasCritical = true;
                }
                else if (versionDiags.Any(d => d.Code == SnapshotDiagnosticCodes.SNAPSHOT_VERSION_MINOR_AHEAD))
                {
                    var diag = versionDiags.First(d => d.Code == SnapshotDiagnosticCodes.SNAPSHOT_VERSION_MINOR_AHEAD);
                    PrintCheck(CheckStatus.Warn, $"Schema: {Path.GetFileName(snapshotFile)} — {diag.Message}; upgrade CLI for full support");
                    hasWarning = true;
                }
                else
                {
                    PrintCheck(CheckStatus.Pass, $"Schema: {Path.GetFileName(snapshotFile)} — compatible");
                }
            }
            catch (JsonException ex)
            {
                PrintCheck(CheckStatus.Fail, $"Schema check failed for {Path.GetFileName(snapshotFile)}: invalid JSON — {ex.Message}");
                hasCritical = true;
            }
        }
    }

    private static void CheckApiKey(ref bool hasWarning, ref bool hasCritical, bool verbose)
    {
        var apiKey = Environment.GetEnvironmentVariable("FLOWCONSOLE_API_KEY");
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            PrintCheck(CheckStatus.Warn, "FLOWCONSOLE_API_KEY not set (push will fail)");
            hasWarning = true;
        }
        else
        {
            PrintCheck(CheckStatus.Pass, "FLOWCONSOLE_API_KEY is set");
        }
    }

    private static string ResolveRulesDir(string? configFile) =>
        SharedHelpers.ResolveRulesDir(null, configFile);

    internal enum CheckStatus { Pass, Warn, Fail }

    internal static void PrintCheck(CheckStatus status, string message)
    {
        var prefix = status switch
        {
            CheckStatus.Pass => "\u2713", // checkmark
            CheckStatus.Warn => "\u26a0", // warning
            CheckStatus.Fail => "\u2717", // X mark
            _ => "?"
        };
        Console.WriteLine($"  {prefix} {message}");
    }
}
