using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Code;

public sealed record ProducerElement : CodeElement
{
    public override ElementKind Kind => ElementKind.Producer;
    public string? Topic { get; init; }
    public string? BrokerType { get; init; }
}
