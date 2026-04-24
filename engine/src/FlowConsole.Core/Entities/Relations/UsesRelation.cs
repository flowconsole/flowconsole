using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Relations;

public sealed record UsesRelation : RelationshipBase
{
    public override RelationKind Kind => RelationKind.Uses;
}
