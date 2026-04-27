using FlowConsole.Core.Evidence;

namespace FlowConsole.Scanners.Helm;

/// <summary>
/// Result of Helm workload inference: a workload root with optional linked
/// Service and Ingress resources and an overall confidence score.
/// </summary>
public sealed record HelmWorkloadResult(
    string WorkloadName,
    string WorkloadKind,
    string? ServiceName,
    string? IngressName,
    Confidence Confidence,
    IReadOnlyList<EvidenceRecord> SupportingEvidence);

/// <summary>
/// Groups Helm Kubernetes evidence around workload roots (Deployment,
/// StatefulSet, DaemonSet) and links them with Services and Ingresses.
/// </summary>
public static class HelmWorkloadInferer
{
    private static readonly HashSet<string> WorkloadKinds = new(StringComparer.OrdinalIgnoreCase)
    {
        "Deployment", "StatefulSet", "DaemonSet",
    };

    public static IReadOnlyList<HelmWorkloadResult> Infer(IReadOnlyList<EvidenceRecord> evidence)
    {
        ArgumentNullException.ThrowIfNull(evidence);

        var resources = evidence
            .Where(e => e.EvidenceKind == EvidenceKind.KubernetesResource)
            .ToList();

        var exposures = evidence
            .Where(e => e.EvidenceKind == EvidenceKind.Exposure)
            .ToList();

        // Index resources by kind
        var workloads = new List<(string Name, string Kind, EvidenceRecord Evidence)>();
        var services = new Dictionary<string, EvidenceRecord>(StringComparer.OrdinalIgnoreCase);
        var ingresses = new Dictionary<string, (EvidenceRecord Evidence, List<string> BackendServices)>(StringComparer.OrdinalIgnoreCase);

        foreach (var r in resources)
        {
            var kind = ExtractKind(r.EvidenceValue);
            var name = r.Subject;

            if (kind is null || string.IsNullOrEmpty(name))
                continue;

            if (WorkloadKinds.Contains(kind))
            {
                workloads.Add((name, kind, r));
            }
            else if (kind.Equals("Service", StringComparison.OrdinalIgnoreCase))
            {
                services[name] = r;
            }
            else if (kind.Equals("Ingress", StringComparison.OrdinalIgnoreCase))
            {
                var backendServices = ResolveIngressBackends(name, exposures);
                ingresses[name] = (r, backendServices);
            }
        }

        var results = new List<HelmWorkloadResult>();

        if (workloads.Count == 0)
        {
            // No workload roots -> low-confidence fallback
            // Emit one result per service as a best-effort guess
            foreach (var (svcName, svcEvidence) in services)
            {
                results.Add(new HelmWorkloadResult(
                    WorkloadName: svcName,
                    WorkloadKind: "Service",
                    ServiceName: svcName,
                    IngressName: null,
                    Confidence: Confidence.Low,
                    SupportingEvidence: [svcEvidence]));
            }

            return results;
        }

        foreach (var (wlName, wlKind, wlEvidence) in workloads)
        {
            // Link Service by name convention: service name matches or contains workload name
            var linkedService = FindLinkedService(wlName, services);
            var supportingEvidence = new List<EvidenceRecord> { wlEvidence };

            string? linkedIngressName = null;

            if (linkedService is not null)
            {
                supportingEvidence.Add(linkedService.Value.Evidence);

                // Link Ingress by backend service reference
                linkedIngressName = FindLinkedIngress(linkedService.Value.Name, ingresses);
                if (linkedIngressName is not null &&
                    ingresses.TryGetValue(linkedIngressName, out var ingressEntry))
                {
                    supportingEvidence.Add(ingressEntry.Evidence);
                }
            }

            var confidence = (linkedService, linkedIngressName) switch
            {
                (not null, not null) => Confidence.High,
                (not null, null) => Confidence.Medium,
                _ => Confidence.Low,
            };

            results.Add(new HelmWorkloadResult(
                WorkloadName: wlName,
                WorkloadKind: wlKind,
                ServiceName: linkedService?.Name,
                IngressName: linkedIngressName,
                Confidence: confidence,
                SupportingEvidence: supportingEvidence));
        }

        return results;
    }

    private static string? ExtractKind(string evidenceValue)
    {
        // EvidenceValue format: "resource:Kind:name[:namespace]|..."
        if (!evidenceValue.StartsWith("resource:", StringComparison.Ordinal))
            return null;

        var afterPrefix = evidenceValue.AsSpan(9); // "resource:".Length
        var pipeIdx = afterPrefix.IndexOf('|');
        var identity = pipeIdx >= 0 ? afterPrefix[..pipeIdx] : afterPrefix;

        var colonIdx = identity.IndexOf(':');
        return colonIdx >= 0 ? identity[..colonIdx].ToString() : null;
    }

    private static (string Name, EvidenceRecord Evidence)? FindLinkedService(
        string workloadName,
        Dictionary<string, EvidenceRecord> services)
    {
        // Exact match first
        if (services.TryGetValue(workloadName, out var exact))
            return (workloadName, exact);

        // Convention: service name contains workload name or vice versa
        foreach (var (svcName, svcEvidence) in services)
        {
            if (svcName.Contains(workloadName, StringComparison.OrdinalIgnoreCase) ||
                workloadName.Contains(svcName, StringComparison.OrdinalIgnoreCase))
            {
                return (svcName, svcEvidence);
            }
        }

        return null;
    }

    private static string? FindLinkedIngress(
        string serviceName,
        Dictionary<string, (EvidenceRecord Evidence, List<string> BackendServices)> ingresses)
    {
        foreach (var (ingressName, entry) in ingresses)
        {
            if (entry.BackendServices.Any(bs =>
                bs.Equals(serviceName, StringComparison.OrdinalIgnoreCase)))
            {
                return ingressName;
            }
        }

        // Fallback: name convention
        foreach (var (ingressName, _) in ingresses)
        {
            if (ingressName.Contains(serviceName, StringComparison.OrdinalIgnoreCase) ||
                serviceName.Contains(ingressName, StringComparison.OrdinalIgnoreCase))
            {
                return ingressName;
            }
        }

        return null;
    }

    private static List<string> ResolveIngressBackends(
        string ingressName,
        List<EvidenceRecord> exposures)
    {
        // Ingress exposure evidence: Subject=ingressName, EvidenceValue="ingress:host" or "ingress:external"
        // We cannot directly resolve backend service names from the exposure evidence alone,
        // so we use the ingress name as a hint for name-based matching.
        // This is sufficient for Helm charts where naming is conventional.
        return [ingressName];
    }
}
