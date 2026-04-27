using FlowConsole.Core.Entities;

namespace FlowConsole.Core.Interfaces;

/// <summary>
/// Abstracts git repository operations used by the sync pipeline and editor commit-back flow.
/// </summary>
public interface IGitService
{
    /// <summary>Clones a remote repository to the specified local path.
    /// Optionally clones a specific <paramref name="branch"/>; if <paramref name="commitSha"/> is also
    /// provided the working tree is checked out to that exact commit after cloning.</summary>
    Task CloneAsync(string repoUrl, string localPath, string? branch = null, string? commitSha = null, GitProviderConfig? providerConfig = null, bool shallow = false, CancellationToken ct = default);

    /// <summary>
    /// Pulls the latest changes into an already-cloned local repository.
    /// Returns true when new commits were fetched (fast-forward or merge), false when already up to date.
    /// </summary>
    Task<bool> PullAsync(string repoPath, GitProviderConfig? providerConfig = null, CancellationToken ct = default);

    /// <summary>
    /// Stages the specified files, creates a commit, and pushes to origin.
    /// Used by the backend batch-commit path (e.g., after writing generated files).
    /// </summary>
    Task CommitAndPushAsync(
        string repoPath,
        string message,
        IReadOnlyList<string> files,
        GitProviderConfig? providerConfig = null,
        CancellationToken ct = default);

    /// <summary>
    /// Single-file overload: clones the repo to a temp directory, writes <paramref name="content"/>
    /// to <paramref name="filePath"/>, commits, and pushes.
    /// Used by the Monaco Editor "commit to Git" UI action.
    /// </summary>
    Task CommitAndPushAsync(
        string repoUrl,
        string branch,
        string filePath,
        string content,
        string message,
        GitProviderConfig? providerConfig = null,
        CancellationToken ct = default);

    /// <summary>Returns file paths in <paramref name="repoPath"/> that match <paramref name="globPattern"/>.</summary>
    Task<IReadOnlyList<string>> GetFilesAsync(string repoPath, string globPattern, CancellationToken ct = default);

    /// <summary>Reads and returns the UTF-8 content of a file within <paramref name="repoPath"/>.</summary>
    Task<string> GetFileContentAsync(string repoPath, string filePath, CancellationToken ct = default);

    /// <summary>Returns the diff between two commits (file-level: adds/modifies/deletes/renames).</summary>
    Task<GitDiff> GetDiffAsync(string repoPath, string fromCommit, string toCommit, CancellationToken ct = default);

    /// <summary>Lists all branches (local + remote) in the repository.</summary>
    Task<IReadOnlyList<GitBranchInfo>> ListBranchesAsync(string repoPath, GitProviderConfig? providerConfig = null, CancellationToken ct = default);

    /// <summary>Lists remote branches via <c>git ls-remote --heads</c> without cloning the repository.</summary>
    Task<IReadOnlyList<GitBranchInfo>> ListRemoteBranchesAsync(string repoUrl, GitProviderConfig? providerConfig = null, CancellationToken ct = default);

    /// <summary>Creates a new branch from the current HEAD and pushes it to origin.</summary>
    Task CreateBranchAsync(string repoPath, string branchName, GitProviderConfig? providerConfig = null, CancellationToken ct = default);

    /// <summary>Checks out the specified branch in the working tree.</summary>
    Task CheckoutBranchAsync(string repoPath, string branchName, CancellationToken ct = default);
}
