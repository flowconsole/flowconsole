namespace FlowConsole.Core.Entities;

public sealed record DriftConfig
{
    public bool AutoEnabled { get; init; } = true;
    public IReadOnlyList<string> Sources { get; init; } = ["CodeScan", "InfraScan"];
    public decimal Threshold { get; init; } = 80;
    public decimal? NotifyOnScoreBelow { get; init; }
}
