using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Relations;

public sealed record CallsRelation : RelationshipBase
{
    public override RelationKind Kind => RelationKind.Calls;
    public string? Protocol { get; init; }
}
