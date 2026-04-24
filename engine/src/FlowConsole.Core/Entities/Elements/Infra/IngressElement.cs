using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Infra;

public sealed record IngressElement : InfraElement
{
    public override ElementKind Kind => ElementKind.Ingress;
}
