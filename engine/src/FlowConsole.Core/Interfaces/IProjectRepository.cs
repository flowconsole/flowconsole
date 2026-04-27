using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Shared.Paging;

namespace FlowConsole.Core.Interfaces;

public interface IProjectRepository
{
    Task<Project?> GetByIdAsync(ProjectId id, CancellationToken ct);
    Task<PagedResult<Project>> GetByOwnerAsync(Guid ownerId, PagedQuery query, CancellationToken ct);
    Task<PagedResult<Project>> GetByMemberAsync(Guid userId, PagedQuery query, CancellationToken ct);
    Task<Project> CreateAsync(Project project, CancellationToken ct);
    Task<Project> UpdateAsync(Project project, CancellationToken ct);
    Task DeleteAsync(ProjectId id, CancellationToken ct);
}
