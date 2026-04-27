using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Entities.Relations;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Shared.Paging;

namespace FlowConsole.Core.Interfaces;

public interface IGraphStore
{
    // Lifecycle
    Task CreateGraphAsync(ModelId modelId, CancellationToken ct);
    Task DropGraphAsync(ModelId modelId, CancellationToken ct);

    // Rebuild: deletes elements/relationships with the given source, then creates new ones.
    // Used for Replace strategy (Git Sync, Push API, Import Replace).
    Task RebuildBySourceAsync(ModelId modelId, string source,
        IReadOnlyList<ElementBase> elements, IReadOnlyList<RelationshipBase> relationships, CancellationToken ct);

    // Full rebuild (all sources)
    Task RebuildAllAsync(ModelId modelId,
        IReadOnlyList<ElementBase> elements, IReadOnlyList<RelationshipBase> relationships, CancellationToken ct);

    // Merge: updates existing by ID, adds new, does NOT delete absent.
    // Used for Import MergeStrategy.Merge (Phase 4).
    Task MergeBySourceAsync(ModelId modelId, string source,
        IReadOnlyList<ElementBase> elements, IReadOnlyList<RelationshipBase> relationships, CancellationToken ct);

    // Add new only: adds elements/relationships only if their ID is not yet in the graph.
    // Used for Import MergeStrategy.Skip (Phase 4).
    Task AddNewBySourceAsync(ModelId modelId, string source,
        IReadOnlyList<ElementBase> elements, IReadOnlyList<RelationshipBase> relationships, CancellationToken ct);

    // Reading — paging=null returns all elements (for internal operations: rebuild, drift, analytics)
    Task<PagedResult<ElementBase>> GetElementsAsync(ModelId modelId, ElementFilter? filter, PagedQuery? paging, CancellationToken ct);
    Task<ElementBase?> GetElementAsync(ModelId modelId, ElementId elementId, CancellationToken ct);
    Task<PagedResult<RelationshipBase>> GetRelationshipsAsync(ModelId modelId, RelationshipFilter? filter, PagedQuery? paging, CancellationToken ct);
    Task<RelationshipBase?> GetRelationshipAsync(ModelId modelId, RelationshipId relationshipId, CancellationToken ct);

    // Canonical mapping: updates canonical_id on elements in the graph.
    // mappings: Dictionary<ElementId, string?> — element -> canonical_id (null = clear mapping)
    Task UpdateCanonicalMappingsAsync(ModelId modelId,
        IReadOnlyDictionary<ElementId, string?> mappings, CancellationToken ct);

    // Returns all elements with an assigned canonical_id
    Task<IReadOnlyDictionary<ElementId, string>> GetCanonicalMappingsAsync(ModelId modelId, CancellationToken ct);
}

public sealed record ElementFilter
{
    public ElementSource? Source { get; init; }
    public ElementKind? Kind { get; init; }
    public string? Tag { get; init; }
    public ElementId? ParentId { get; init; }
    public string? CanonicalId { get; init; }
    public string? SearchQuery { get; init; }
    public string? Technology { get; init; }
    public string? Name { get; init; }
}

public sealed record RelationshipFilter
{
    public ElementSource? Source { get; init; }
    public RelationKind? Kind { get; init; }
    public ElementId? SourceElementId { get; init; }
    public ElementId? TargetElementId { get; init; }
}
