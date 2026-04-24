using FluentResults;

namespace FlowConsole.Schema.SnapshotValidation;

/// <summary>
/// Validates a raw JSON document against the ModelSnapshot JSON Schema (syntactic).
/// Separate from <see cref="FlowConsole.Core.Interfaces.IModelSnapshotValidator"/> which
/// performs semantic validation on typed DTOs.
/// </summary>
public interface IJsonSchemaValidator
{
    Result<IReadOnlyList<SchemaDiagnostic>> Validate(System.Text.Json.JsonDocument document);
}
