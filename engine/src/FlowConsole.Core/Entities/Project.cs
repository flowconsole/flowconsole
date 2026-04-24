using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities;

public sealed record Project
{
    public ProjectId Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public Guid OwnerId { get; init; }
    public MetaSchemaId DefaultMetaSchemaId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
