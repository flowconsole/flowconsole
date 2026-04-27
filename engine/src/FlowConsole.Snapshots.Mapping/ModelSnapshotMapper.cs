using FlowConsole.Core.Entities;
using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Entities.Relations;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Rules.Core.Bindings;

namespace FlowConsole.Snapshots.Mapping;

/// <summary>
/// Maps a <see cref="ModelSnapshot"/> to lists of <see cref="ElementRef"/> and <see cref="RelationshipRef"/>
/// for use by the rule engine. Per Decisions D1 and D2.
/// </summary>
public static class ModelSnapshotMapper
{
    public static (List<ElementRef> Elements, List<RelationshipRef> Relationships) Map(ModelSnapshot snapshot)
    {
        var elements = snapshot.Elements.Select(MapElement).ToList();
        var relationships = snapshot.Relationships.Select(MapRelationship).ToList();

        return (elements, relationships);
    }

    private static ElementRef MapElement(ElementBase element)
    {
        // Source is already resolved by the deserializer/constructor:
        // - SnapshotDeserializer resolves per-element source or falls back to snapshot source
        // - Backend code paths set source explicitly on each element
        // We cannot use != default to detect "unset" because ElementSource.Git is enum zero.
        var effectiveSource = element.Source;
        var sourceFamily = SourceFamilyResolver.Resolve(effectiveSource);
        var sourceName = effectiveSource.ToString();
        var sourceFamilyName = sourceFamily.ToString();

        var canonicalId = !string.IsNullOrEmpty(element.CanonicalId)
            ? element.CanonicalId
            : $"{sourceName}:{element.Id.Value}".ToLowerInvariant();

        return new ElementRef
        {
            Id = element.Id.Value,
            CanonicalId = canonicalId,
            Kind = element.Kind.ToString(),
            Name = element.Name,
            Technology = element.Technology,
            Tags = element.Tags.Select(t => t.Value).ToList(),
            Properties = element.Properties.ToDictionary(kv => kv.Key, kv => (object?)kv.Value),
            Source = sourceName,
            SourceFamily = sourceFamilyName,
            ParentId = element.ParentId?.Value
        };
    }

    private static RelationshipRef MapRelationship(RelationshipBase relationship)
    {
        // Source is already resolved by the deserializer/constructor (see MapElement comment).
        var effectiveSource = relationship.Source;
        var sourceFamily = SourceFamilyResolver.Resolve(effectiveSource);
        var sourceName = effectiveSource.ToString();
        var sourceFamilyName = sourceFamily.ToString();

        return new RelationshipRef
        {
            Id = relationship.Id.Value,
            Kind = relationship.Kind.ToString(),
            SourceId = relationship.SourceId.Value,
            TargetId = relationship.TargetId.Value,
            Technology = relationship.Technology,
            Tags = [],
            Properties = relationship.Properties.ToDictionary(kv => kv.Key, kv => (object?)kv.Value),
            Source = sourceName,
            SourceFamily = sourceFamilyName
        };
    }
}
