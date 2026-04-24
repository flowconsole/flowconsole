using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Diagnostics;
using FlowConsole.Rules.Core.Model;

namespace FlowConsole.Rules.Core.Ingest;

/// <summary>
/// Orchestrates the rule file ingest pipeline.
/// Phase 1: Parse (YAML/JSON) → Phase 2: Schema validation → Phase 3: Semantic validation
/// → Phase 4: Expression compilation → Phase 5: Normalization.
/// Short-circuits on parse/schema errors — subsequent phases are not run.
/// Semantic errors are collected (not short-circuit) but block subsequent phases.
/// Expression errors are collected but block normalization.
/// </summary>
public sealed class IngestPipeline
{
    private readonly RuleFileParser _parser = new();
    private readonly SchemaValidator _schemaValidator = new();
    private readonly SemanticValidator _semanticValidator = new();
    private readonly ExpressionPhase? _expressionPhase;
    private readonly Normalizer _normalizer = new();

    /// <summary>
    /// Creates a pipeline that runs phases 1-3 only (parse, schema, semantic).
    /// Used when no expression compiler is available.
    /// </summary>
    public IngestPipeline()
    {
    }

    /// <summary>
    /// Creates a pipeline that runs all 5 phases (parse, schema, semantic, expression, normalize).
    /// </summary>
    public IngestPipeline(IExpressionCompiler expressionCompiler, IHelperCatalog helperCatalog)
    {
        _expressionPhase = new ExpressionPhase(expressionCompiler, helperCatalog);
    }

    /// <summary>
    /// Runs the ingest pipeline on the given content.
    /// Returns the parsed RuleFile model with diagnostics (phases 1-3 only).
    /// </summary>
    public IngestResult Run(string content, string filePath)
    {
        // Phase 1: Parse
        var parseResult = _parser.Parse(content, filePath);
        if (parseResult.Document == null)
            return new IngestResult(null, parseResult.Diagnostics);

        // Phase 2: Schema validation
        var schemaResult = _schemaValidator.Validate(parseResult.Document, filePath);

        var allDiagnostics = parseResult.Diagnostics
            .Concat(schemaResult.Diagnostics)
            .ToList();

        if (schemaResult.RuleFile == null)
            return new IngestResult(null, allDiagnostics);

        // Phase 3: Semantic validation
        var semanticResult = _semanticValidator.Validate(schemaResult.RuleFile);
        allDiagnostics.AddRange(semanticResult.Diagnostics);

        if (semanticResult.HasErrors)
            return new IngestResult(null, allDiagnostics);

        return new IngestResult(schemaResult.RuleFile, allDiagnostics);
    }

    /// <summary>
    /// Runs the full ingest pipeline (all 5 phases) and returns a compiled FlowConsoleRuleFile.
    /// Requires expression compiler to be provided via constructor.
    /// </summary>
    public FullIngestResult RunFull(string content, string filePath)
    {
        // Phase 1: Parse
        var parseResult = _parser.Parse(content, filePath);
        if (parseResult.Document == null)
            return new FullIngestResult(null, parseResult.Diagnostics);

        // Phase 2: Schema validation
        var schemaResult = _schemaValidator.Validate(parseResult.Document, filePath);

        var allDiagnostics = parseResult.Diagnostics
            .Concat(schemaResult.Diagnostics)
            .ToList();

        if (schemaResult.RuleFile == null)
            return new FullIngestResult(null, allDiagnostics);

        // Phase 3: Semantic validation
        var semanticResult = _semanticValidator.Validate(schemaResult.RuleFile);
        allDiagnostics.AddRange(semanticResult.Diagnostics);

        if (semanticResult.HasErrors)
            return new FullIngestResult(null, allDiagnostics);

        // Phase 4: Expression compilation
        if (_expressionPhase == null)
            throw new InvalidOperationException(
                "Expression compiler not configured. Use the constructor that accepts IExpressionCompiler.");

        var expressionResult = _expressionPhase.Compile(schemaResult.RuleFile, filePath);
        allDiagnostics.AddRange(expressionResult.Diagnostics);

        if (expressionResult.HasErrors)
            return new FullIngestResult(null, allDiagnostics);

        // Phase 5: Normalization
        var normalizeResult = _normalizer.Normalize(expressionResult.CompiledRules, filePath);
        allDiagnostics.AddRange(normalizeResult.Diagnostics);

        if (normalizeResult.HasErrors)
            return new FullIngestResult(null, allDiagnostics);

        var ruleFile = new FlowConsoleRuleFile(filePath, normalizeResult.Rules, allDiagnostics);
        return new FullIngestResult(ruleFile, allDiagnostics);
    }
}

/// <summary>
/// Result of running the ingest pipeline (phases 1-3).
/// Contains the parsed RuleFile (null if errors) and all diagnostics.
/// </summary>
public sealed record IngestResult(
    RuleFile? RuleFile,
    IReadOnlyList<Diagnostic> Diagnostics)
{
    public bool HasErrors => Diagnostics.Any(d => d.Level == DiagnosticLevel.Error);
}

/// <summary>
/// Result of running the full ingest pipeline (all 5 phases).
/// Contains the compiled FlowConsoleRuleFile (null if errors) and all diagnostics.
/// </summary>
public sealed record FullIngestResult(
    FlowConsoleRuleFile? RuleFile,
    IReadOnlyList<Diagnostic> Diagnostics)
{
    public bool HasErrors => Diagnostics.Any(d => d.Level == DiagnosticLevel.Error);
}
