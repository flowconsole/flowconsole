namespace FlowConsole.Core.Entities;

public sealed record CodeParserOptions
{
    public static readonly IReadOnlyList<string> DefaultExcludePaths =
    [
        "node_modules", "vendor", "bin", ".git", "obj", "out", "dist", "build",
        ".idea", ".vscode", "target", "__pycache__", ".pytest_cache"
    ];

    public IReadOnlyList<string> IncludePaths { get; init; } = [];
    public IReadOnlyList<string> ExcludePaths { get; init; } = DefaultExcludePaths;
    public int MaxFileSizeBytes { get; init; } = 1024 * 1024; // 1 MB

    public static CodeParserOptions Default => new();
}
