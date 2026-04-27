namespace FlowConsole.Core.ValueObjects;

public enum ElementSource
{
    Git,
    CodeScan,
    InfraScan,
    Observability,
    Import
}

/// <summary>
/// Parsing helpers for ElementSource using standard enum names (e.g. "CodeScan", "Git").
/// </summary>
public static class ElementSourceParser
{
    /// <summary>
    /// Tries to parse a source string using standard enum member names (case-insensitive).
    /// Returns false for null/empty input or numeric strings that map to undefined enum values.
    /// </summary>
    public static bool TryParse(string? value, out ElementSource result)
    {
        result = default;
        if (string.IsNullOrWhiteSpace(value))
            return false;

        if (Enum.TryParse(value, ignoreCase: true, out result) && Enum.IsDefined(result))
            return true;

        result = default;
        return false;
    }
}
