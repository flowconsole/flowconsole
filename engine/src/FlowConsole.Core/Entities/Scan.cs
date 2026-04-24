using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities;

public sealed record Scan
{
    public ScanId Id { get; init; }
    public ProjectId ProjectId { get; init; }
    public ModelId ModelId { get; init; }
    public ElementSource ScanType { get; init; }
    public string Status { get; init; } = "pending";
    public IReadOnlyDictionary<string, string> Config { get; init; } = new Dictionary<string, string>();
    public ModelSnapshot? ResultSnapshot { get; init; }
    public string? ErrorMessage { get; init; }
    public DateTimeOffset? StartedAt { get; init; }
    public DateTimeOffset? CompletedAt { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}
