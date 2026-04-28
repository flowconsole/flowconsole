namespace FlowConsole.Cli.Hosting;

public sealed class SnapshotTooLargeException : Exception
{
    public SnapshotTooLargeException(string filePath, long fileSize, long maxBytes)
        : base($"file is {fileSize:N0} bytes, exceeding limit of {maxBytes:N0} bytes")
    {
        FilePath = filePath;
        FileSize = fileSize;
        MaxBytes = maxBytes;
    }

    public string FilePath { get; }
    public long FileSize { get; }
    public long MaxBytes { get; }
}
