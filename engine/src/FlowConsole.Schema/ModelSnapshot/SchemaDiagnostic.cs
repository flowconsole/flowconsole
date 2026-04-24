namespace FlowConsole.Schema.SnapshotValidation;

/// <summary>
/// A single diagnostic produced during ModelSnapshot validation.
/// </summary>
public sealed record SchemaDiagnostic(
    string Code,
    DiagnosticLevel Level,
    string Path,
    string Message,
    string? Hint = null)
{
    public string Phase => Code switch
    {
        _ when Code.StartsWith("SNAPSHOT_SCHEMA_", StringComparison.Ordinal) => "schema",
        _ when Code.StartsWith("SNAPSHOT_VERSION_", StringComparison.Ordinal) => "version",
        _ when Code.StartsWith("SNAPSHOT_REF_", StringComparison.Ordinal) => "reference",
        _ when Code.StartsWith("SNAPSHOT_LIMIT_", StringComparison.Ordinal) => "limit",
        _ => "unknown"
    };
}

public enum DiagnosticLevel
{
    Warning,
    Error
}
