namespace FlowConsole.Core.Entities;

public sealed record ModelFileRef
{
    public string Branch { get; init; } = string.Empty;
    public string RelativePath { get; init; } = string.Empty;
}
