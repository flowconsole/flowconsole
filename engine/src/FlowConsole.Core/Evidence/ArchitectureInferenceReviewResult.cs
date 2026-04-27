namespace FlowConsole.Core.Evidence;

public sealed record ArchitectureInferenceReviewResult(
    InferenceReviewVerdict Verdict,
    string? SuggestedValue,
    string Rationale,
    Confidence Confidence,
    string? ModelId);
