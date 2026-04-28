namespace FlowConsole.Cli.Hosting;

public sealed class SnapshotsNotFoundException : Exception
{
    public SnapshotsNotFoundException(string searchDirectory)
        : base($"No snapshot files found in '{searchDirectory}'")
    {
        SearchDirectory = searchDirectory;
    }

    public string SearchDirectory { get; }
}
