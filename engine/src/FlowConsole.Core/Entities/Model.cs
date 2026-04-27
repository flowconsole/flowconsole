using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities;

public sealed record Model
{
    public ModelId Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public ProjectId ProjectId { get; init; }
    public ModelVersion Version { get; init; }
    public MetaSchemaId MetaSchemaId { get; init; }
    public GitConfig? GitConfig { get; init; }
    public IReadOnlyList<ModelFileRef> ModelFiles { get; init; } = [];
    public DriftConfig? DriftConfig { get; init; }
    public IReadOnlyList<Flow>? Flows { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
