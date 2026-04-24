using FlowConsole.Core.Evidence;

namespace FlowConsole.Scanners.Core;

/// <summary>
/// No-op adjudicator that passes through the deterministic baseline unchanged.
/// Used by CLI and offline scenarios where LLM is not available.
/// </summary>
public sealed class NoOpAdjudicator : IAdjudicator
{
    public bool IsAvailable => false;

    public Task<ArchitectureInferenceReviewResult> ReviewAsync<T>(
        InferenceResult<T> deterministicResult,
        IReadOnlyList<EvidenceRecord> evidence,
        string inferenceQuestion,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(deterministicResult);

        var result = new ArchitectureInferenceReviewResult(
            InferenceReviewVerdict.Confirm,
            null,
            "LLM not available",
            deterministicResult.Confidence,
            null);

        return Task.FromResult(result);
    }
}
