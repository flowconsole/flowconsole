namespace FlowConsole.Core.Entities;

/// <summary>Represents the diff between two commits in a git repository.</summary>
public sealed record GitDiff
{
    public string FromCommit { get; init; } = string.Empty;
    public string ToCommit { get; init; } = string.Empty;
    public IReadOnlyList<GitFileChange> Changes { get; init; } = [];
}

/// <summary>Represents a single file change within a git diff.</summary>
public sealed record GitFileChange
{
    /// <summary>Path of the file (new path for renames).</summary>
    public string FilePath { get; init; } = string.Empty;

    /// <summary>Change type: "added" | "modified" | "deleted" | "renamed".</summary>
    public string ChangeType { get; init; } = string.Empty;

    /// <summary>Original file path before rename; null for non-rename changes.</summary>
    public string? OldFilePath { get; init; }
}
