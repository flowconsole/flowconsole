using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Interfaces;

public interface IProjectMemberRepository
{
    Task<IReadOnlyList<ProjectMember>> GetByProjectAsync(ProjectId projectId, CancellationToken ct);
    Task<ProjectMember?> GetAsync(ProjectId projectId, Guid userId, CancellationToken ct);
    Task AddAsync(ProjectMember member, CancellationToken ct);
    Task UpdateRoleAsync(ProjectId projectId, Guid userId, string role, CancellationToken ct);
    Task RemoveAsync(ProjectId projectId, Guid userId, CancellationToken ct);
}
