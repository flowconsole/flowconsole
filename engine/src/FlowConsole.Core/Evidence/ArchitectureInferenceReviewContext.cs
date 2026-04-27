namespace FlowConsole.Core.Evidence;

public sealed record ArchitectureInferenceReviewContext(
    string InferenceQuestion,
    string DeterministicValue,
    Confidence DeterministicConfidence,
    IReadOnlyList<string> CandidateAlternatives,
    IReadOnlyList<EvidenceRecord> EvidenceBundle,
    string SourceAdapter);
