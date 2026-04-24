namespace FlowConsole.Shared.Paging;

public sealed record PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int Limit { get; init; }
    public int TotalPages => Limit > 0 ? (int)Math.Ceiling((double)TotalCount / Limit) : 0;
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;

    public static PagedResult<T> Create(IReadOnlyList<T> items, int totalCount, PagedQuery query) =>
        new()
        {
            Items = items,
            TotalCount = totalCount,
            Page = query.Page,
            Limit = query.Limit
        };
}
