using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Infra;

public sealed record NamespaceElement : InfraElement
{
    public override ElementKind Kind => ElementKind.Namespace;
}
