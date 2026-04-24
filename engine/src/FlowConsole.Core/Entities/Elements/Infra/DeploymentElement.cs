using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Infra;

public sealed record DeploymentElement : InfraElement
{
    public override ElementKind Kind => ElementKind.Deployment;
    public int? Replicas { get; init; }
}
