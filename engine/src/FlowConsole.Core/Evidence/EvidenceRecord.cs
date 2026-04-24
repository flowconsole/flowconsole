namespace FlowConsole.Core.Evidence;

public sealed record EvidenceRecord(
    string Subject,
    EvidenceKind EvidenceKind,
    string EvidenceValue,
    string? Location,
    string OriginFile,
    string SourceAdapter,
    int? WeightHint);
