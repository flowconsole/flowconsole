using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Entities.Relations;
using FlowConsole.Core.Evidence;
using FlowConsole.Core.Factories;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Scanners.CSharp;

/// <summary>
/// Maps C# runtime/boundary/outbound inference results into
/// typed Element and Relationship objects directly.
/// </summary>
public static class CSharpConceptProjector
{
    private const int CodeDerivedPriority = 10;
    private const int AppHostPriority = 100;

    public static (IReadOnlyList<ElementBase> Elements, IReadOnlyList<RelationshipBase> Relationships) Project(
        IReadOnlyList<ApplicationBoundary> boundaries,
        IReadOnlyDictionary<string, IReadOnlyList<EvidenceRecord>> capabilityEvidence,
        IReadOnlyDictionary<string, IReadOnlyList<EvidenceRecord>> outboundEvidence,
        AspireTopologyModel? aspireTopology = null,
        string? repoRootPath = null)
    {
        ArgumentNullException.ThrowIfNull(boundaries);
        ArgumentNullException.ThrowIfNull(capabilityEvidence);
        ArgumentNullException.ThrowIfNull(outboundEvidence);

        var elements = new Dictionary<string, (ElementBase Element, int Priority)>(StringComparer.Ordinal);
        var relations = new Dictionary<string, (RelationshipBase Relation, int Priority)>(StringComparer.Ordinal);
        var boundaryIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var externalTargets = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var boundary in boundaries)
        {
            var rootKind = MapRuntimeKindToElementKind(boundary.RuntimeKind);
            var rootCanonicalId = $"csharp:{boundary.RootProjectName}";
            boundaryIds.Add(rootCanonicalId);

            var projectPath = repoRootPath is not null
                ? Path.GetRelativePath(repoRootPath, boundary.RootProjectPath).Replace('\\', '/')
                : boundary.RootProjectPath;

            var rootProps = new Dictionary<string, string>
            {
                ["runtimeKind"] = boundary.RuntimeKind.ToString(),
                ["projectPath"] = projectPath,
                ["confidence"] = boundary.Confidence.ToString(),
                ["inferenceConfidence"] = boundary.Confidence.ToString(),
            };

            AddElement(elements, ElementFactory.Create(
                rootKind,
                new ElementId(rootCanonicalId),
                boundary.RootProjectName,
                ElementSource.CodeScan,
                technology: "C#/.NET",
                canonicalId: rootCanonicalId,
                properties: rootProps), AppHostPriority);

            if (capabilityEvidence.TryGetValue(boundary.RootProjectName, out var capabilities))
            {
                var hasHttp = capabilities.Any(e =>
                    e.EvidenceKind == EvidenceKind.Capability &&
                    e.EvidenceValue.Contains("HttpApi", StringComparison.OrdinalIgnoreCase));

                if (hasHttp)
                {
                    var apiCanonicalId = $"csharp:{boundary.RootProjectName}:api";
                    AddElement(elements, ElementFactory.Create(
                        ElementKind.Endpoint,
                        new ElementId(apiCanonicalId),
                        $"{boundary.RootProjectName} API",
                        ElementSource.CodeScan,
                        technology: "HTTP",
                        canonicalId: apiCanonicalId,
                        properties: new Dictionary<string, string>
                        {
                            ["httpMethod"] = "*",
                            ["confidence"] = boundary.Confidence.ToString(),
                            ["inferenceConfidence"] = boundary.Confidence.ToString(),
                        }), AppHostPriority);

                    AddRelation(relations, RelationshipFactory.Create(
                        RelationKind.Exposes,
                        new RelationshipId($"{rootCanonicalId}_exposes_{apiCanonicalId}"),
                        new ElementId(rootCanonicalId),
                        new ElementId(apiCanonicalId),
                        ElementSource.CodeScan,
                        label: "HTTP API",
                        properties: new Dictionary<string, string>
                        {
                            ["confidence"] = boundary.Confidence.ToString(),
                        }), AppHostPriority);
                }
            }

            if (outboundEvidence.TryGetValue(boundary.RootProjectName, out var outbound))
            {
                foreach (var record in outbound.Where(e =>
                             e.EvidenceKind == EvidenceKind.OutboundCommunication))
                {
                    var descriptor = ParseOutbound(record.EvidenceValue);
                    if (string.IsNullOrWhiteSpace(descriptor.Target))
                        continue;

                    var target = descriptor.Target!;
                    var aspireMatch = ResolveAspireMatch(aspireTopology, target);
                    if (aspireMatch is not null)
                    {
                        AddRelation(relations, RelationshipFactory.Create(
                            MapAspireResourceRelationKind(aspireMatch.ResourceKind),
                            new RelationshipId($"{rootCanonicalId}_{MapAspireResourceRelationKind(aspireMatch.ResourceKind).ToString().ToLowerInvariant()}_{aspireMatch.ResourceId}"),
                            new ElementId(rootCanonicalId),
                            new ElementId(aspireMatch.ResourceId),
                            ElementSource.CodeScan,
                            properties: new Dictionary<string, string>
                            {
                                ["confidence"] = Confidence.Medium.ToString(),
                            }), CodeDerivedPriority);
                        continue;
                    }

                    var resolvedMatches = ResolveInternalMatches(boundaries, target);

                    if (resolvedMatches.Count == 1)
                    {
                        var resolvedBoundary = resolvedMatches[0];
                        var targetCanonicalId = $"csharp:{resolvedBoundary.RootProjectName}";
                        AddRelation(relations, RelationshipFactory.Create(
                            RelationKind.Calls,
                            new RelationshipId($"{rootCanonicalId}_calls_{targetCanonicalId}"),
                            new ElementId(rootCanonicalId),
                            new ElementId(targetCanonicalId),
                            ElementSource.CodeScan,
                            properties: new Dictionary<string, string>
                            {
                                ["confidence"] = Confidence.Medium.ToString(),
                            }), CodeDerivedPriority);
                    }
                    else if (resolvedMatches.Count == 0 &&
                             ShouldProjectAsExternal(descriptor.Kind, target, aspireTopology))
                    {
                        var externalName = GetExternalDisplayName(target);
                        var externalId = $"external:{NormalizeExternalId(externalName)}";
                        if (externalTargets.Add(externalId))
                        {
                            AddElement(elements, ElementFactory.Create(
                                ElementKind.External,
                                new ElementId(externalId),
                                externalName,
                                ElementSource.CodeScan,
                                canonicalId: externalId,
                                properties: new Dictionary<string, string>
                                {
                                    ["confidence"] = Confidence.Medium.ToString(),
                                    ["inferenceConfidence"] = Confidence.Medium.ToString(),
                                }), CodeDerivedPriority);
                        }

                        AddRelation(relations, RelationshipFactory.Create(
                            RelationKind.Calls,
                            new RelationshipId($"{rootCanonicalId}_calls_{externalId}"),
                            new ElementId(rootCanonicalId),
                            new ElementId(externalId),
                            ElementSource.CodeScan,
                            properties: new Dictionary<string, string>
                            {
                                ["confidence"] = Confidence.Medium.ToString(),
                            }), CodeDerivedPriority);
                    }
                }
            }

            foreach (var owned in boundary.OwnedProjects)
            {
                var ownedCanonicalId = $"csharp:{owned}";

                AddElement(elements, ElementFactory.Create(
                    ElementKind.Module,
                    new ElementId(ownedCanonicalId),
                    owned,
                    ElementSource.CodeScan,
                    technology: "C#/.NET",
                    canonicalId: ownedCanonicalId,
                    properties: new Dictionary<string, string>
                    {
                        ["confidence"] = boundary.Confidence.ToString(),
                        ["inferenceConfidence"] = boundary.Confidence.ToString(),
                    }), CodeDerivedPriority);

                AddRelation(relations, RelationshipFactory.Create(
                    RelationKind.Contains,
                    new RelationshipId($"{rootCanonicalId}_contains_{ownedCanonicalId}"),
                    new ElementId(rootCanonicalId),
                    new ElementId(ownedCanonicalId),
                    ElementSource.CodeScan,
                    properties: new Dictionary<string, string>
                    {
                        ["confidence"] = boundary.Confidence.ToString(),
                    }), AppHostPriority);
            }
        }

        if (aspireTopology is not null)
        {
            ProjectAspireTopology(aspireTopology, elements, relations, boundaryIds);
        }

        return (
            elements.Values.Select(entry => entry.Element).ToList(),
            relations.Values.Select(entry => entry.Relation).ToList());
    }

    private static void ProjectAspireTopology(
        AspireTopologyModel topology,
        Dictionary<string, (ElementBase Element, int Priority)> elements,
        Dictionary<string, (RelationshipBase Relation, int Priority)> relations,
        IReadOnlySet<string> boundaryIds)
    {
        foreach (var resource in topology.Resources)
        {
            if (resource.ResourceKind == AspireResourceKind.Project)
            {
                if (boundaryIds.Contains(resource.ResourceId))
                    continue;

                AddElement(elements, ElementFactory.Create(
                    ElementKind.Application,
                    new ElementId(resource.ResourceId),
                    resource.Name,
                    ElementSource.CodeScan,
                    technology: "C#/.NET",
                    canonicalId: resource.ResourceId,
                    properties: new Dictionary<string, string>(resource.Properties)
                    {
                        ["confidence"] = resource.Confidence.ToString(),
                        ["inferenceConfidence"] = resource.Confidence.ToString(),
                    }), AppHostPriority);
                continue;
            }

            AddElement(elements, ElementFactory.Create(
                MapAspireResourceKindToElementKind(resource.ResourceKind),
                new ElementId(resource.ResourceId),
                resource.Name,
                ElementSource.CodeScan,
                canonicalId: resource.ResourceId,
                properties: new Dictionary<string, string>(resource.Properties)
                {
                    ["confidence"] = resource.Confidence.ToString(),
                    ["inferenceConfidence"] = resource.Confidence.ToString(),
                }), AppHostPriority);
        }

        foreach (var link in topology.Links)
        {
            var relationKind = link.LinkKind == AspireLinkKind.Calls ? RelationKind.Calls : RelationKind.DependsOn;
            AddRelation(relations, RelationshipFactory.Create(
                relationKind,
                new RelationshipId($"{link.SourceResourceId}_{relationKind.ToString().ToLowerInvariant()}_{link.TargetResourceId}"),
                new ElementId(link.SourceResourceId),
                new ElementId(link.TargetResourceId),
                ElementSource.CodeScan,
                label: link.EvidenceLabel,
                properties: new Dictionary<string, string>
                {
                    ["confidence"] = link.Confidence.ToString(),
                }), AppHostPriority);
        }
    }

    private static void AddElement(
        Dictionary<string, (ElementBase Element, int Priority)> elements,
        ElementBase element,
        int priority)
    {
        var key = element.CanonicalId ?? element.Id.Value;
        if (elements.TryGetValue(key, out var existing) && existing.Priority > priority)
            return;

        elements[key] = (element, priority);
    }

    private static void AddRelation(
        Dictionary<string, (RelationshipBase Relation, int Priority)> relations,
        RelationshipBase relation,
        int priority)
    {
        var key = relation.Id.Value;
        if (relations.TryGetValue(key, out var existing))
        {
            if (existing.Priority >= priority)
                return;
        }

        relations[key] = (relation, priority);
    }

    private static ElementKind MapRuntimeKindToElementKind(RuntimeCandidateKind kind) =>
        kind switch
        {
            RuntimeCandidateKind.WebApplication => ElementKind.Service,
            RuntimeCandidateKind.Worker => ElementKind.Worker,
            RuntimeCandidateKind.ConsoleTool => ElementKind.Application,
            RuntimeCandidateKind.Entrypoint => ElementKind.Application,
            _ => ElementKind.Application,
        };

    internal static ElementKind MapAspireResourceKindToElementKind(AspireResourceKind kind) =>
        kind switch
        {
            AspireResourceKind.Gateway => ElementKind.Gateway,
            AspireResourceKind.Database => ElementKind.Database,
            AspireResourceKind.Cache => ElementKind.Cache,
            AspireResourceKind.Broker => ElementKind.Broker,
            _ => ElementKind.Application,
        };

    private static (string Kind, string? Target) ParseOutbound(string evidenceValue)
    {
        var value = evidenceValue.StartsWith("Outbound:", StringComparison.OrdinalIgnoreCase)
            ? evidenceValue["Outbound:".Length..]
            : evidenceValue;

        var colonIdx = value.IndexOf(':');
        if (colonIdx < 0)
            return (value.Trim(), null);

        var kind = value[..colonIdx].Trim();
        var target = value[(colonIdx + 1)..].Trim();
        return (kind, string.IsNullOrWhiteSpace(target) ? null : target);
    }

    private static IReadOnlyList<ApplicationBoundary> ResolveInternalMatches(
        IReadOnlyList<ApplicationBoundary> boundaries,
        string target)
    {
        var hostToken = ExtractHostToken(target);
        var normalizedTarget = NormalizeIdentifier(hostToken);
        if (string.IsNullOrWhiteSpace(normalizedTarget))
            return [];

        var directMatches = boundaries
            .Where(boundary => GetBoundaryAliases(boundary).Contains(normalizedTarget))
            .ToList();

        if (directMatches.Count == 1)
            return directMatches;

        if (ContainsIndirectionMarker(hostToken))
            return [];

        var stripped = StripSymbolicSuffixes(hostToken);
        if (string.Equals(stripped, hostToken, StringComparison.Ordinal))
            return directMatches;

        var normalizedStripped = NormalizeIdentifier(stripped);
        if (string.IsNullOrWhiteSpace(normalizedStripped))
            return [];

        return boundaries
            .Where(boundary => GetBoundaryAliases(boundary).Contains(normalizedStripped))
            .ToList();
    }

    private static ResourceDescriptorMatch? ResolveAspireMatch(AspireTopologyModel? topology, string target)
    {
        if (topology is null || topology.Resources.Count == 0)
            return null;

        var hostToken = ExtractHostToken(target);
        var aliases = BuildAliasCandidates(hostToken).ToHashSet(StringComparer.Ordinal);
        if (aliases.Count == 0)
            return null;

        var matches = topology.Resources
            .Select(resource => new ResourceDescriptorMatch(resource.ResourceId, resource.ResourceKind, GetAspireResourceAliases(resource)))
            .Where(resource => resource.Aliases.Any(alias => aliases.Contains(alias)))
            .ToList();

        return matches.Count == 1 ? matches[0] : null;
    }

    private sealed record ResourceDescriptorMatch(
        string ResourceId,
        AspireResourceKind ResourceKind,
        IReadOnlySet<string> Aliases);

    private static RelationKind MapAspireResourceRelationKind(AspireResourceKind resourceKind) =>
        resourceKind switch
        {
            AspireResourceKind.Project => RelationKind.Calls,
            AspireResourceKind.Gateway => RelationKind.Calls,
            AspireResourceKind.Database => RelationKind.DependsOn,
            AspireResourceKind.Cache => RelationKind.DependsOn,
            AspireResourceKind.Broker => RelationKind.DependsOn,
            _ => RelationKind.Calls,
        };

    private static IReadOnlySet<string> GetAspireResourceAliases(AspireResourceDescriptor resource)
    {
        var aliases = new HashSet<string>(StringComparer.Ordinal);

        aliases.Add(NormalizeIdentifier(resource.Name));

        if (resource.Properties.TryGetValue("resourceName", out var resourceName) &&
            !string.IsNullOrWhiteSpace(resourceName))
        {
            aliases.Add(NormalizeIdentifier(resourceName));

            var stripped = StripSymbolicSuffixes(resourceName);
            if (!string.Equals(stripped, resourceName, StringComparison.Ordinal))
                aliases.Add(NormalizeIdentifier(stripped));
        }

        if (resource.Properties.TryGetValue("projectName", out var projectName) &&
            !string.IsNullOrWhiteSpace(projectName))
        {
            aliases.Add(NormalizeIdentifier(projectName));
        }

        return aliases;
    }

    private static IEnumerable<string> BuildAliasCandidates(string target)
    {
        var current = target;
        if (!string.IsNullOrWhiteSpace(current))
            yield return NormalizeIdentifier(current);

        var stripped = StripSymbolicSuffixes(current);
        if (!string.Equals(stripped, current, StringComparison.Ordinal) && !string.IsNullOrWhiteSpace(stripped))
            yield return NormalizeIdentifier(stripped);
    }

    private static bool ShouldProjectAsExternal(string kind, string target, AspireTopologyModel? topology)
    {
        if (ResolveAspireMatch(topology, target) is not null)
            return false;

        var hostToken = ExtractHostToken(target);
        if (IsLoopbackHost(hostToken))
            return false;

        if (string.Equals(kind, "MessageBus", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(hostToken, "eventbus", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return target.Contains('.') ||
               target.Contains("://", StringComparison.Ordinal) ||
               target.StartsWith("https+http://", StringComparison.OrdinalIgnoreCase) ||
               target.StartsWith("http+https://", StringComparison.OrdinalIgnoreCase);
    }

    private static string GetExternalDisplayName(string target)
    {
        var host = ExtractHostToken(target);
        return string.IsNullOrWhiteSpace(host) ? target : host;
    }

    private static string NormalizeExternalId(string target)
    {
        var host = ExtractHostToken(target);
        return (string.IsNullOrWhiteSpace(host) ? target : host).ToLowerInvariant();
    }

    private static string ExtractHostToken(string target)
    {
        var working = target.Trim();
        var schemeIdx = working.IndexOf("://", StringComparison.Ordinal);
        if (schemeIdx >= 0)
            working = working[(schemeIdx + 3)..];

        var slashIdx = working.IndexOf('/');
        if (slashIdx >= 0)
            working = working[..slashIdx];

        var colonIdx = working.IndexOf(':');
        if (colonIdx >= 0)
            working = working[..colonIdx];

        return working.Trim();
    }

    private static string NormalizeIdentifier(string value)
    {
        Span<char> buffer = stackalloc char[value.Length];
        var index = 0;

        foreach (var ch in value)
        {
            if (char.IsLetterOrDigit(ch))
                buffer[index++] = char.ToLowerInvariant(ch);
        }

        return new string(buffer[..index]);
    }

    private static IReadOnlySet<string> GetBoundaryAliases(ApplicationBoundary boundary)
    {
        var aliases = new HashSet<string>(StringComparer.Ordinal)
        {
            NormalizeIdentifier(boundary.RootProjectName)
        };

        var normalizedRoot = NormalizeIdentifier(boundary.RootProjectName);
        AddTrimmedAlias(aliases, normalizedRoot, "api");
        AddTrimmedAlias(aliases, normalizedRoot, "service");
        AddTrimmedAlias(aliases, normalizedRoot, "worker");

        return aliases;
    }

    private static void AddTrimmedAlias(HashSet<string> aliases, string value, string suffix)
    {
        if (!value.EndsWith(suffix, StringComparison.Ordinal) || value.Length <= suffix.Length)
            return;

        aliases.Add(value[..^suffix.Length]);
    }

    internal static bool ContainsIndirectionMarker(string target)
    {
        return target.Contains("Gateway", StringComparison.OrdinalIgnoreCase) ||
               target.Contains("Proxy", StringComparison.OrdinalIgnoreCase) ||
               target.Contains("Bff", StringComparison.OrdinalIgnoreCase);
    }

    private static string StripSymbolicSuffixes(string target)
    {
        var result = target;

        foreach (var suffix in new[] { "EndpointBase", "BaseAddress", "Endpoint", "Authority", "Url", "Uri", "Host" })
        {
            if (result.EndsWith(suffix, StringComparison.OrdinalIgnoreCase) &&
                result.Length > suffix.Length)
            {
                result = result[..^suffix.Length];
                break;
            }
        }

        return result;
    }

    private static bool IsLoopbackHost(string host)
    {
        return string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(host, "127.0.0.1", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(host, "10.0.2.2", StringComparison.OrdinalIgnoreCase);
    }
}
