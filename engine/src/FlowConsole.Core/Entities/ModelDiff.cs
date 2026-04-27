namespace FlowConsole.Core.Entities;

public sealed record ModelDiff
{
    public DriftResult Drift { get; init; } = new();
}
