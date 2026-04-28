using FlowConsole.Core.Entities;
using FlowConsole.Scanners.Core;

namespace FlowConsole.Cli.Scanners;

internal sealed class CSharpScannerAdapter
{
    private readonly ICodeParser _parser;

    public CSharpScannerAdapter(ICodeParser parser)
    {
        _parser = parser;
    }

    public string Language => _parser.Language;
    public IReadOnlyList<string> FileExtensions => _parser.FileExtensions;

    public async Task<ScanResult> ScanAsync(string path, bool strict, CancellationToken ct)
    {
        var diagnostics = new List<ScanDiagnostic>();
        ModelSnapshot? snapshot = null;

        try
        {
            snapshot = await _parser.ParseProjectAsync(path, CodeParserOptions.Default, ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            diagnostics.Add(new ScanDiagnostic(
                ScanDiagnosticSeverity.Error,
                "SCAN_PARSE_ERROR",
                $"Failed to parse: {ex.Message}",
                path));

            if (strict)
            {
                return new ScanResult
                {
                    Snapshot = EmptySnapshot(),
                    Diagnostics = diagnostics,
                    FilesScanned = 0,
                    FilesSkipped = 1
                };
            }
        }

        snapshot ??= EmptySnapshot();

        return new ScanResult
        {
            Snapshot = snapshot,
            Diagnostics = diagnostics,
            FilesScanned = snapshot.Elements.Count > 0 ? 1 : 0,
            FilesSkipped = diagnostics.Count(d => d.Severity == ScanDiagnosticSeverity.Error)
        };
    }

    private static ModelSnapshot EmptySnapshot() =>
        new(FlowConsole.Core.ValueObjects.ElementSource.CodeScan, [], []);
}
