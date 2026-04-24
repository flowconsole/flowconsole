using FlowConsole.Cli.Synth;

namespace FlowConsole.Cli.Tests.Synth;

/// <summary>
/// Test double for <see cref="LiveDiffFetcher"/> that returns a pre-configured result.
/// </summary>
internal sealed class FakeLiveDiffFetcher : LiveDiffFetcher
{
    private readonly FetchResult _result;

    public FakeLiveDiffFetcher(FetchResult result) : base(new HttpClient())
    {
        _result = result;
    }

    public override Task<FetchResult> FetchSnapshotAsync(string apiUrl, string modelId, CancellationToken ct = default)
    {
        return Task.FromResult(_result);
    }
}
