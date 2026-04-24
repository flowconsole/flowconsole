using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Relations;

public sealed record ConsumesRelation : RelationshipBase
{
    public override RelationKind Kind => RelationKind.Consumes;
    public string? Topic { get; init; }
}
