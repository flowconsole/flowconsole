namespace FlowConsole.Core.Evidence;

public enum EvidenceKind
{
    ProjectDescriptor,
    ProjectDependency,
    RuntimeCandidate,
    Boundary,
    Capability,
    OutboundCommunication,
    ConfigEndpointHint,
    ChartMetadata,
    ChartDependency,
    KubernetesResource,
    Exposure,
    DeploymentHint
}
