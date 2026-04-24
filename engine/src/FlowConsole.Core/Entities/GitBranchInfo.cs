namespace FlowConsole.Core.Entities;

/// <summary>Represents a git branch with its name and whether it is the currently checked-out branch.</summary>
public sealed record GitBranchInfo
{
    /// <summary>Branch name (e.g. "main", "feature/foo"). Remote prefix stripped for remote-tracking branches.</summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>True if this is the currently checked-out branch.</summary>
    public bool IsCurrent { get; init; }

    /// <summary>True if this is a remote-tracking branch (e.g. origin/main).</summary>
    public bool IsRemote { get; init; }
}
