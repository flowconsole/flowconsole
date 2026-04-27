using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Relations;

public sealed record DeployedOnRelation : RelationshipBase
{
    public override RelationKind Kind => RelationKind.DeployedOn;
}
