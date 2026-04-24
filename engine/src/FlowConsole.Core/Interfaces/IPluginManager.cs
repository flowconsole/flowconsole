using FlowConsole.Core.Entities;

namespace FlowConsole.Core.Interfaces;

public interface IPluginManager
{
    IReadOnlyList<ICodeParser> GetCodeParsers();
    IReadOnlyList<IInfraScanner> GetInfraScanners();
    IReadOnlyList<IImporter> GetImporters();
    Task LoadExternalPluginsAsync(CancellationToken ct);
}

public interface ICodeParser
{
    string Language { get; }
    IReadOnlyList<string> FileExtensions { get; }
    Task<ModelSnapshot> ParseProjectAsync(string projectPath, CodeParserOptions options, CancellationToken ct = default);
}

public interface IInfraScanner
{
    string ScannerType { get; }
    Task<ModelSnapshot> ScanAsync(ScannerConfig config, CancellationToken ct = default);
}

public interface IImporter
{
    string ImporterType { get; }
    IReadOnlyList<string> SupportedFormats { get; }

    /// <summary>
    /// Parses the stream into a ModelSnapshot.
    /// The config dictionary contains format-specific options (e.g. CMDB column mapping).
    /// </summary>
    Task<ModelSnapshot> ImportAsync(
        Stream stream,
        IReadOnlyDictionary<string, string>? config,
        CancellationToken ct = default);
}
