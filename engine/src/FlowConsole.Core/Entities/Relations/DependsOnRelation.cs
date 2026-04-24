using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Relations;

public sealed record DependsOnRelation : RelationshipBase
{
    public override RelationKind Kind => RelationKind.DependsOn;
}
