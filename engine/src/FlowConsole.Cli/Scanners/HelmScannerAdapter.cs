using FlowConsole.Core.Entities;
using FlowConsole.Core.Interfaces;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Scanners.Core;
using FlowConsole.Scanners.Helm;

namespace FlowConsole.Cli.Scanners;

internal sealed class HelmScannerAdapter
{
    private readonly HelmChartScanner _scanner = new();

    public async Task<ScanResult> ScanAsync(string chartDir, bool strict, CancellationToken ct)
    {
        var diagnostics = new List<ScanDiagnostic>();

        if (!File.Exists(Path.Combine(chartDir, "Chart.yaml")))
        {
            diagnostics.Add(new ScanDiagnostic(
                ScanDiagnosticSeverity.Error,
                "HELM_NO_CHART",
                $"No Chart.yaml found in: {chartDir}",
                chartDir));

            return new ScanResult
            {
                Snapshot = EmptySnapshot(),
                Diagnostics = diagnostics,
                FilesScanned = 0,
                FilesSkipped = 0
            };
        }

        ModelSnapshot? snapshot = null;
        try
        {
            var config = new ScannerConfig
            {
                ScannerType = "helm",
                Parameters = new Dictionary<string, string> { ["chart_dir"] = chartDir }
            };

            snapshot = await _scanner.ScanAsync(config, ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            diagnostics.Add(new ScanDiagnostic(
                ScanDiagnosticSeverity.Error,
                "HELM_SCAN_ERROR",
                $"Helm scan failed: {ex.Message}",
                chartDir));

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
        new(ElementSource.InfraScan, [], []);
}
