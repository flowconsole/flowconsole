using FlowConsole.Core.Entities;
using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Entities.Relations;
using FlowConsole.Core.Evidence;
using FlowConsole.Core.Interfaces;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Scanners.Helm;

/// <summary>
/// Orchestration-only Helm scanner: delegates to evidence-first pipeline
/// (HelmEvidenceCollector -> HelmWorkloadInferer -> HelmConceptProjector)
/// and returns a ModelSnapshot with typed elements and relationships.
/// Source: ElementSource.InfraScan
/// </summary>
public sealed class HelmChartScanner : IInfraScanner
{
    public string ScannerType => "helm";

    public Task<ModelSnapshot> ScanAsync(ScannerConfig config, CancellationToken ct = default)
    {
        var chartDir = config.Get("chart_dir");
        if (string.IsNullOrEmpty(chartDir) || !Directory.Exists(chartDir))
            throw new ArgumentException($"Helm chart directory not found: '{chartDir}'.");

        // Stage 1: Collect evidence from chart directory
        var evidence = HelmEvidenceCollector.Collect(chartDir);

        // Extract chart name from metadata evidence
        var chartName = ExtractChartName(evidence, chartDir);

        // Stage 2: Infer workloads from evidence
        var workloads = HelmWorkloadInferer.Infer(evidence);

        // Stage 3: Project to typed elements and relationships
        var chartDependencies = evidence
            .Where(e => e.EvidenceKind == EvidenceKind.ChartDependency)
            .ToList();
        var (elements, relationships) = HelmConceptProjector.Project(chartName, workloads, chartDependencies);

        // Enrich elements with provenance properties
        var enrichedElements = EnrichWithProvenance(elements, chartName, chartDir);

        // Assemble final ModelSnapshot
        var snapshot = new ModelSnapshot(
            ElementSource.InfraScan,
            enrichedElements,
            relationships);

        return Task.FromResult(snapshot);
    }

    private static string ExtractChartName(IReadOnlyList<EvidenceRecord> evidence, string chartDir)
    {
        var nameEvidence = evidence.FirstOrDefault(e =>
            e.EvidenceKind == EvidenceKind.ChartMetadata &&
            e.EvidenceValue.StartsWith("name:", StringComparison.Ordinal));

        if (nameEvidence is not null)
            return nameEvidence.EvidenceValue[5..]; // "name:".Length

        return Path.GetFileName(chartDir.TrimEnd('/', '\\'));
    }

    private static IReadOnlyList<ElementBase> EnrichWithProvenance(
        IReadOnlyList<ElementBase> elements,
        string chartName,
        string chartPath)
    {
        var enriched = new List<ElementBase>(elements.Count);
        foreach (var element in elements)
        {
            var props = new Dictionary<string, string>(element.Properties)
            {
                ["chart_name"] = chartName,
                ["chartPath"] = chartPath,
            };

            // Add workload/service name provenance based on canonical ID structure
            var prefix = $"helm:{chartName}:";
            var idValue = element.Id.Value;
            if (idValue.StartsWith(prefix, StringComparison.Ordinal))
            {
                var suffix = idValue[prefix.Length..];
                if (suffix.EndsWith(":svc", StringComparison.Ordinal))
                {
                    props["service_name"] = suffix[..^4]; // remove ":svc"
                }
                else
                {
                    props["workload_name"] = suffix;
                }
            }

            // Use with-expression to create enriched copy with updated properties
            enriched.Add(element with { Properties = props });
        }

        return enriched;
    }
}
