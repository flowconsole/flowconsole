namespace FlowConsole.Cli.Hosting;

public sealed class SourceFilterEmptyException : Exception
{
    public SourceFilterEmptyException(string sourceFilter, int totalCandidates)
        : base($"No snapshots match source filter '{sourceFilter}' ({totalCandidates} candidate(s) checked)")
    {
        SourceFilter = sourceFilter;
        TotalCandidates = totalCandidates;
    }

    public string SourceFilter { get; }
    public int TotalCandidates { get; }
}
