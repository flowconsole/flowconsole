using FlowConsole.Core.Entities;

namespace FlowConsole.Scanners.Core;

/// <summary>
/// Parses source code in a specific language and produces a ModelSnapshot.
/// </summary>
public interface ICodeParser
{
    string Language { get; }
    IReadOnlyList<string> FileExtensions { get; }
    Task<ModelSnapshot> ParseProjectAsync(string projectPath, CodeParserOptions options, CancellationToken ct = default);
}
