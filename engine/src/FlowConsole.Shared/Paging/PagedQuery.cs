namespace FlowConsole.Shared.Paging;

public sealed record PagedQuery
{
    public int Page { get; init; } = 1;
    public int Limit { get; init; } = 20;
    public string? SortBy { get; init; }
    public bool SortDescending { get; init; }

    public int Skip => (Page - 1) * Limit;
}
