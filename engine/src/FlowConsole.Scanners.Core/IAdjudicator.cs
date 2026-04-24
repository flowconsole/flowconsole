using FlowConsole.Core.Evidence;

namespace FlowConsole.Scanners.Core;

/// <summary>
/// Adjudicates low-confidence inference results, optionally using an LLM.
/// CLI binds NoOpAdjudicator; backend DI binds LlmAdjudicator.
/// </summary>
public interface IAdjudicator
{
    bool IsAvailable { get; }

    Task<ArchitectureInferenceReviewResult> ReviewAsync<T>(
        InferenceResult<T> deterministicResult,
        IReadOnlyList<EvidenceRecord> evidence,
        string inferenceQuestion,
        CancellationToken ct);
}
