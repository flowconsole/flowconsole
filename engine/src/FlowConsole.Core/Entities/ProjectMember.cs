using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities;

public sealed record ProjectMember
{
    public ProjectId ProjectId { get; init; }
    public Guid UserId { get; init; }
    public string Role { get; init; } = "viewer";
    public DateTimeOffset CreatedAt { get; init; }
}
