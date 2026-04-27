using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Code;

public sealed record ClassElement : CodeElement
{
    public override ElementKind Kind => ElementKind.Class;
    public bool IsAbstract { get; init; }
    public string? Namespace { get; init; }
}
