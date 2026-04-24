using System.Reflection;
using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Ingest;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// Loads built-in YAML rule files from embedded resources, ingests them through
/// the pipeline, and caches the compiled result.
/// </summary>
public sealed class BuiltInRuleLoader
{
    private readonly Lazy<FlowConsoleRuleFile?> _cached;

    public BuiltInRuleLoader(IExpressionCompiler expressionCompiler, IHelperCatalog helperCatalog)
    {
        _cached = new Lazy<FlowConsoleRuleFile?>(() => LoadAndIngest(expressionCompiler, helperCatalog));
    }

    /// <summary>
    /// Returns the compiled built-in rules, or null if loading/ingest failed.
    /// The result is cached after first call.
    /// </summary>
    public FlowConsoleRuleFile? GetBuiltInRules() => _cached.Value;

    /// <summary>
    /// Merges built-in rules into a user-provided rule file.
    /// Returns a new FlowConsoleRuleFile containing both user and built-in rules.
    /// </summary>
    public FlowConsoleRuleFile MergeWithBuiltIn(FlowConsoleRuleFile userRuleFile)
    {
        var builtIn = GetBuiltInRules();
        if (builtIn == null || builtIn.Rules.Count == 0)
            return userRuleFile;

        var mergedRules = userRuleFile.Rules.Concat(builtIn.Rules).ToList();
        var mergedDiagnostics = userRuleFile.Diagnostics.Concat(builtIn.Diagnostics).ToList();

        return new FlowConsoleRuleFile(userRuleFile.FilePath, mergedRules, mergedDiagnostics);
    }

    private static FlowConsoleRuleFile? LoadAndIngest(
        IExpressionCompiler expressionCompiler,
        IHelperCatalog helperCatalog)
    {
        var assembly = typeof(BuiltInRuleLoader).Assembly;
        var resourceNames = assembly.GetManifestResourceNames()
            .Where(n => n.EndsWith(".rule.yaml", StringComparison.OrdinalIgnoreCase))
            .OrderBy(n => n)
            .ToList();

        if (resourceNames.Count == 0)
            return null;

        var pipeline = new IngestPipeline(expressionCompiler, helperCatalog);
        var allRules = new List<FlowConsoleRule>();
        var allDiagnostics = new List<FlowConsole.Rules.Core.Diagnostics.Diagnostic>();

        foreach (var resourceName in resourceNames)
        {
            using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream == null) continue;

            using var reader = new StreamReader(stream);
            var content = reader.ReadToEnd();

            var filePath = $"builtin://{resourceName}";
            var result = pipeline.RunFull(content, filePath);

            allDiagnostics.AddRange(result.Diagnostics);

            if (result.RuleFile != null)
                allRules.AddRange(result.RuleFile.Rules);
        }

        return new FlowConsoleRuleFile("builtin://", allRules, allDiagnostics);
    }
}
