namespace FlowConsole.Rules.Core.Bindings;

/// <summary>
/// Summary drift structure passed as the 'diff' binding in diff rules.
/// </summary>
public sealed record DriftDiff
{
    public IReadOnlyList<ElementRef> Added { get; init; } = [];
    public IReadOnlyList<ElementRef> Removed { get; init; } = [];
    public IReadOnlyList<DiffItem> Changed { get; init; } = [];
    public IReadOnlyList<ElementRef> UnmatchedModel { get; init; } = [];
    public IReadOnlyList<ElementRef> UnmatchedActual { get; init; } = [];
    public required double Score { get; init; }
}
