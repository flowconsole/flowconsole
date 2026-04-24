using FlowConsole.Core.Evidence;

namespace FlowConsole.Scanners.CSharp;

public enum AspireResourceKind
{
    Project,
    Gateway,
    Database,
    Cache,
    Broker,
}

public enum AspireLinkKind
{
    Calls,
    DependsOn,
}

public sealed record AspireResourceDescriptor(
    string ResourceId,
    AspireResourceKind ResourceKind,
    string Name,
    string SourceProjectName,
    string SourceFile,
    Confidence Confidence,
    IReadOnlyDictionary<string, string> Properties);

public sealed record AspireTopologyLinkDescriptor(
    string SourceResourceId,
    string TargetResourceId,
    AspireLinkKind LinkKind,
    string EvidenceLabel,
    Confidence Confidence);

public sealed record AspireTopologyModel(
    IReadOnlyList<AspireResourceDescriptor> Resources,
    IReadOnlyList<AspireTopologyLinkDescriptor> Links)
{
    public static AspireTopologyModel Empty { get; } = new([], []);
}
