using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Relations;

public sealed record ExposesRelation : RelationshipBase
{
    public override RelationKind Kind => RelationKind.Exposes;
}
