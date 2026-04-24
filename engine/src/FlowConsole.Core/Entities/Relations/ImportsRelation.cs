using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Relations;

public sealed record ImportsRelation : RelationshipBase
{
    public override RelationKind Kind => RelationKind.Imports;
}
