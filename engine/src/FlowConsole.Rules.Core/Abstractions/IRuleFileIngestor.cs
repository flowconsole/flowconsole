using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Diagnostics;

namespace FlowConsole.Rules.Core.Abstractions;

/// <summary>
/// Ingests a YAML or JSON rule file string, running parse, schema, semantic,
/// expression, and normalize phases. Returns a compiled rule file or diagnostics.
/// </summary>
public interface IRuleFileIngestor
{
    /// <summary>
    /// Ingests a rule file from its text content.
    /// </summary>
    /// <param name="content">YAML or JSON string.</param>
    /// <param name="filePath">Path to the file (used for diagnostic messages and canonical key generation).</param>
    /// <returns>
    /// A compiled rule file with diagnostics. If blocking diagnostics are present,
    /// <see cref="FlowConsoleRuleFile.Rules"/> will be empty.
    /// </returns>
    FlowConsoleRuleFile Ingest(string content, string filePath);
}
