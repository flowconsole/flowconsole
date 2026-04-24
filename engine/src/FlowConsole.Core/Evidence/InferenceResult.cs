namespace FlowConsole.Core.Evidence;

public sealed record InferenceResult<T>(
    T SelectedValue,
    Confidence Confidence,
    IReadOnlyList<EvidenceRecord> SupportingEvidence,
    IReadOnlyList<T>? RejectedAlternatives,
    string? Diagnostics);
