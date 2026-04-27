using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Code;

public sealed record ConsumerElement : CodeElement
{
    public override ElementKind Kind => ElementKind.Consumer;
    public string? Topic { get; init; }
    public string? BrokerType { get; init; }
}
