using FlowConsole.Core.Entities.Relations;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Factories;

/// <summary>
/// Creates the correct <see cref="RelationshipBase"/> subtype from a <see cref="RelationKind"/> discriminator.
/// Used when deserializing from AGE graph or external DTOs where the concrete type is not known at compile time.
/// </summary>
public static class RelationshipFactory
{
    public static RelationshipBase Create(
        RelationKind kind,
        RelationshipId id,
        ElementId sourceId,
        ElementId targetId,
        ElementSource source,
        string? label = null,
        string? technology = null,
        IReadOnlyDictionary<string, string>? properties = null)
    {
        var props = properties ?? new Dictionary<string, string>();

        return kind switch
        {
            RelationKind.Contains => new ContainsRelation
            {
                Id = id,
                SourceId = sourceId,
                TargetId = targetId,
                Source = source,
                Label = label,
                Technology = technology,
                Properties = props
            },
            RelationKind.DeployedOn => new DeployedOnRelation
            {
                Id = id,
                SourceId = sourceId,
                TargetId = targetId,
                Source = source,
                Label = label,
                Technology = technology,
                Properties = props
            },
            RelationKind.Uses => new UsesRelation
            {
                Id = id,
                SourceId = sourceId,
                TargetId = targetId,
                Source = source,
                Label = label,
                Technology = technology,
                Properties = props
            },
            RelationKind.Calls => new CallsRelation
            {
                Id = id,
                SourceId = sourceId,
                TargetId = targetId,
                Source = source,
                Label = label,
                Technology = technology,
                Properties = props,
                Protocol = GetString(props, "protocol")
            },
            RelationKind.DependsOn => new DependsOnRelation
            {
                Id = id,
                SourceId = sourceId,
                TargetId = targetId,
                Source = source,
                Label = label,
                Technology = technology,
                Properties = props
            },
            RelationKind.Imports => new ImportsRelation
            {
                Id = id,
                SourceId = sourceId,
                TargetId = targetId,
                Source = source,
                Label = label,
                Technology = technology,
                Properties = props
            },
            RelationKind.Implements => new ImplementsRelation
            {
                Id = id,
                SourceId = sourceId,
                TargetId = targetId,
                Source = source,
                Label = label,
                Technology = technology,
                Properties = props
            },
            RelationKind.Produces => new ProducesRelation
            {
                Id = id,
                SourceId = sourceId,
                TargetId = targetId,
                Source = source,
                Label = label,
                Technology = technology,
                Properties = props,
                Topic = GetString(props, "topic")
            },
            RelationKind.Consumes => new ConsumesRelation
            {
                Id = id,
                SourceId = sourceId,
                TargetId = targetId,
                Source = source,
                Label = label,
                Technology = technology,
                Properties = props,
                Topic = GetString(props, "topic")
            },
            RelationKind.Exposes => new ExposesRelation
            {
                Id = id,
                SourceId = sourceId,
                TargetId = targetId,
                Source = source,
                Label = label,
                Technology = technology,
                Properties = props
            },
            RelationKind.RoutesTo => new RoutesToRelation
            {
                Id = id,
                SourceId = sourceId,
                TargetId = targetId,
                Source = source,
                Label = label,
                Technology = technology,
                Properties = props
            },
            _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, $"Unknown RelationKind: {kind}")
        };
    }

    private static string? GetString(IReadOnlyDictionary<string, string> props, string key)
        => props.TryGetValue(key, out var value) ? value : null;
}
