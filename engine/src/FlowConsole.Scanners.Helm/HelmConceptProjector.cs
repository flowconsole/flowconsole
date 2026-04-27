using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Entities.Relations;
using FlowConsole.Core.Evidence;
using FlowConsole.Core.Factories;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Scanners.Helm;

/// <summary>
/// Projects Helm workload inference results into typed Element/Relationship
/// (DeploymentElement, ServiceElement, ContainsRelation, DependsOnRelation, DeployedOnRelation).
/// </summary>
public static class HelmConceptProjector
{
    public static (IReadOnlyList<ElementBase> Elements, IReadOnlyList<RelationshipBase> Relationships) Project(
        string chartName,
        IReadOnlyList<HelmWorkloadResult> workloads,
        IReadOnlyList<EvidenceRecord> chartDependencies)
    {
        ArgumentException.ThrowIfNullOrEmpty(chartName);
        ArgumentNullException.ThrowIfNull(workloads);
        ArgumentNullException.ThrowIfNull(chartDependencies);

        var elements = new List<ElementBase>();
        var relationships = new List<RelationshipBase>();

        // Chart root element — deployment node
        var chartCanonicalId = $"helm:{chartName}";
        elements.Add(ElementFactory.Create(
            ElementKind.Deployment,
            new ElementId(chartCanonicalId),
            chartName,
            ElementSource.InfraScan,
            technology: "Helm",
            properties: new Dictionary<string, string>
            {
                ["chartName"] = chartName,
                ["inferenceConfidence"] = Confidence.High.ToString()
            }));

        foreach (var workload in workloads)
        {
            var workloadCanonicalId = $"helm:{chartName}:{workload.WorkloadName}";

            // Workload -> deployment element
            elements.Add(ElementFactory.Create(
                ElementKind.Deployment,
                new ElementId(workloadCanonicalId),
                workload.WorkloadName,
                ElementSource.InfraScan,
                technology: $"Kubernetes/{workload.WorkloadKind}",
                properties: new Dictionary<string, string>
                {
                    ["workloadKind"] = workload.WorkloadKind,
                    ["inferenceConfidence"] = workload.Confidence.ToString()
                }));

            // Chart contains workload
            relationships.Add(RelationshipFactory.Create(
                RelationKind.Contains,
                new RelationshipId($"{chartCanonicalId}_contains_{workloadCanonicalId}"),
                new ElementId(chartCanonicalId),
                new ElementId(workloadCanonicalId),
                ElementSource.InfraScan,
                properties: new Dictionary<string, string>
                {
                    ["confidence"] = workload.Confidence.ToString()
                }));

            // Service exposure -> service + deployedOn
            if (workload.ServiceName is not null)
            {
                var serviceCanonicalId = $"helm:{chartName}:{workload.ServiceName}:svc";

                elements.Add(ElementFactory.Create(
                    ElementKind.Service,
                    new ElementId(serviceCanonicalId),
                    workload.ServiceName,
                    ElementSource.InfraScan,
                    technology: "Kubernetes/Service",
                    properties: new Dictionary<string, string>
                    {
                        ["inferenceConfidence"] = workload.Confidence.ToString()
                    }));

                // Service deployedOn workload
                relationships.Add(RelationshipFactory.Create(
                    RelationKind.DeployedOn,
                    new RelationshipId($"{serviceCanonicalId}_deployedOn_{workloadCanonicalId}"),
                    new ElementId(serviceCanonicalId),
                    new ElementId(workloadCanonicalId),
                    ElementSource.InfraScan,
                    properties: new Dictionary<string, string>
                    {
                        ["confidence"] = workload.Confidence.ToString()
                    }));
            }
        }

        // Chart dependencies -> dependsOn
        foreach (var dep in chartDependencies.Where(e =>
            e.EvidenceKind == EvidenceKind.ChartDependency))
        {
            var depName = ExtractDependencyName(dep.EvidenceValue);
            if (string.IsNullOrEmpty(depName))
                continue;

            var depCanonicalId = $"helm:{depName}";

            // Add dependency chart element if not already the current chart
            if (!depCanonicalId.Equals(chartCanonicalId, StringComparison.OrdinalIgnoreCase))
            {
                elements.Add(ElementFactory.Create(
                    ElementKind.Deployment,
                    new ElementId(depCanonicalId),
                    depName,
                    ElementSource.InfraScan,
                    technology: "Helm",
                    properties: new Dictionary<string, string>
                    {
                        ["chartDependency"] = "true",
                        ["inferenceConfidence"] = Confidence.High.ToString()
                    }));

                relationships.Add(RelationshipFactory.Create(
                    RelationKind.DependsOn,
                    new RelationshipId($"{chartCanonicalId}_dependsOn_{depCanonicalId}"),
                    new ElementId(chartCanonicalId),
                    new ElementId(depCanonicalId),
                    ElementSource.InfraScan,
                    properties: new Dictionary<string, string>
                    {
                        ["confidence"] = Confidence.High.ToString()
                    }));
            }
        }

        return (elements, relationships);
    }

    private static string? ExtractDependencyName(string evidenceValue)
    {
        // Format: "dependency:name:version"
        if (!evidenceValue.StartsWith("dependency:", StringComparison.Ordinal))
            return null;

        var afterPrefix = evidenceValue.AsSpan(11); // "dependency:".Length
        var colonIdx = afterPrefix.IndexOf(':');
        return colonIdx >= 0 ? afterPrefix[..colonIdx].ToString() : afterPrefix.ToString();
    }
}
