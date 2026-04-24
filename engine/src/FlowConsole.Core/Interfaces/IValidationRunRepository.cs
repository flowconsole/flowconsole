using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Shared.Paging;

namespace FlowConsole.Core.Interfaces;

public interface IValidationRunRepository
{
    Task<ValidationRun?> GetByIdAsync(ValidationRunId id, CancellationToken ct);
    Task<PagedResult<ValidationRun>> GetByModelAsync(ModelId modelId, PagedQuery query, CancellationToken ct);
    Task<ValidationRun> CreateAsync(ValidationRun run, CancellationToken ct);
    Task<ValidationRun> UpdateAsync(ValidationRun run, CancellationToken ct);
    Task AddResultsAsync(ValidationRunId runId, IReadOnlyList<ValidationResult> results, CancellationToken ct);
    Task<ValidationRun?> GetLatestByModelAsync(ModelId modelId, CancellationToken ct);
    Task<ValidationRun?> GetLatestByModelAsync(ModelId modelId, bool includeResults, CancellationToken ct);
    Task<ValidationRun?> GetLatestByModelAsync(ModelId modelId, bool includeResults, int resultLimit, CancellationToken ct);
}
