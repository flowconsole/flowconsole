using FlowConsole.Core.Evidence;

namespace FlowConsole.Core.Interfaces;

/// <summary>
/// Service for LLM-backed inference review.
/// </summary>
public interface ILlmService
{
    bool IsAvailable { get; }

    /// <summary>
    /// Reviews an architecture inference result using LLM for low-confidence or ambiguous cases.
    /// </summary>
    Task<ArchitectureInferenceReviewResult> ReviewInferenceAsync(
        ArchitectureInferenceReviewContext context,
        CancellationToken ct);
}
