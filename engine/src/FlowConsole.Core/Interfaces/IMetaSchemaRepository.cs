using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Interfaces;

public interface IMetaSchemaRepository
{
    Task<MetaSchema?> GetByIdAsync(MetaSchemaId id, CancellationToken ct);
    Task<IReadOnlyList<MetaSchema>> GetBuiltinAsync(CancellationToken ct);
    Task<IReadOnlyList<MetaSchema>> GetByProjectAsync(ProjectId projectId, CancellationToken ct);
    Task<MetaSchema> CreateAsync(MetaSchema schema, CancellationToken ct);
    Task<MetaSchema> UpdateAsync(MetaSchema schema, CancellationToken ct);
    Task DeleteAsync(MetaSchemaId id, CancellationToken ct);
    Task<MetaSchema> GetResolvedAsync(MetaSchemaId id, CancellationToken ct);
}
