using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Infra;

public sealed record TopicElement : InfraElement
{
    public override ElementKind Kind => ElementKind.Topic;
    public int? Partitions { get; init; }
}
