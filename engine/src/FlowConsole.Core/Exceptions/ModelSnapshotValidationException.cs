using FlowConsole.Core.Interfaces;

namespace FlowConsole.Core.Exceptions;

/// <summary>
/// Thrown when an uploaded model snapshot fails structural or domain validation.
/// Translates to HTTP 422 Unprocessable Entity.
/// </summary>
public sealed class ModelSnapshotValidationException : Exception
{
    public IReadOnlyList<ModelSnapshotValidationError> Issues { get; }

    public ModelSnapshotValidationException(IReadOnlyList<ModelSnapshotValidationError> issues)
        : base($"Model snapshot validation failed with {issues.Count} error(s)")
    {
        Issues = issues;
    }
}
