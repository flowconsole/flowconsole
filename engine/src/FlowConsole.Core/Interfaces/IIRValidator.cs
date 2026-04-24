using FlowConsole.Core.Entities;

namespace FlowConsole.Core.Interfaces;

/// <summary>Represents a single model snapshot validation error.</summary>
public sealed record ModelSnapshotValidationError(string Code, string Message, string? Path = null);

/// <summary>Result of a model snapshot validation pass.</summary>
public sealed record ModelSnapshotValidationResult
{
    public bool IsValid => Errors.Count == 0;
    public IReadOnlyList<ModelSnapshotValidationError> Errors { get; init; } = [];
}

/// <summary>
/// Validates a ModelSnapshot document — both structurally (schema compliance)
/// and domain-wise (against a resolved MetaSchema).
/// </summary>
public interface IModelSnapshotValidator
{
    ModelSnapshotValidationResult ValidateStructural(ModelSnapshot snapshot);
    ModelSnapshotValidationResult ValidateDomain(ModelSnapshot snapshot, MetaSchema resolvedSchema);
    ModelSnapshotValidationResult Validate(ModelSnapshot snapshot, MetaSchema resolvedSchema);
}
