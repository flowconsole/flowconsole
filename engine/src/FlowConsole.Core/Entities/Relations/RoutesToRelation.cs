using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Relations;

public sealed record RoutesToRelation : RelationshipBase
{
    public override RelationKind Kind => RelationKind.RoutesTo;
}
