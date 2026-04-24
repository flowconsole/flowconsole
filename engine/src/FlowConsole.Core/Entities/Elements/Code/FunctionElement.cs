using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Code;

public sealed record FunctionElement : CodeElement
{
    public override ElementKind Kind => ElementKind.Function;
}
