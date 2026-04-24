using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Code;

public sealed record InterfaceElement : CodeElement
{
    public override ElementKind Kind => ElementKind.Interface;
    public string? Namespace { get; init; }
}
