using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Relations;

public sealed record ImplementsRelation : RelationshipBase
{
    public override RelationKind Kind => RelationKind.Implements;
}
