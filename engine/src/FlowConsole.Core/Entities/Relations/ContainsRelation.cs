using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Relations;

public sealed record ContainsRelation : RelationshipBase
{
    public override RelationKind Kind => RelationKind.Contains;
}
