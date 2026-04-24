using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Relations;

public sealed record ProducesRelation : RelationshipBase
{
    public override RelationKind Kind => RelationKind.Produces;
    public string? Topic { get; init; }
}
