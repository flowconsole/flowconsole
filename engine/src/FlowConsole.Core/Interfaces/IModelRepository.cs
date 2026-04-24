using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Shared.Paging;

namespace FlowConsole.Core.Interfaces;

public interface IModelRepository
{
    Task<Model?> GetByIdAsync(ModelId id, CancellationToken ct);
    Task<PagedResult<Model>> GetByProjectAsync(ProjectId projectId, PagedQuery query, CancellationToken ct);
    Task<Model> CreateAsync(Model model, CancellationToken ct);
    Task<Model> UpdateAsync(Model model, CancellationToken ct);
    Task DeleteAsync(ModelId id, CancellationToken ct);

    /// <summary>
    /// Atomically increments the model version and updates <c>UpdatedAt</c>,
    /// retrying on optimistic concurrency conflicts.
    /// Used by IR upload and other concurrent write paths.
    /// When <paramref name="newFlows"/> is not null, also persists flows in the same save.
    /// </summary>
    Task<Model> IncrementVersionAsync(ModelId id, CancellationToken ct, IReadOnlyList<Flow>? newFlows = null);

    /// <summary>Returns all models that have a non-null GitConfig (used by webhook dispatch).</summary>
    Task<IReadOnlyList<Model>> GetWithGitConfigAsync(CancellationToken ct);
}
