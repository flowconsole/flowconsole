using FlowConsole.Core.Interfaces;

namespace FlowConsole.Schema;

public sealed class C4DataSeeder : IDataSeeder
{
    private readonly IMetaSchemaRepository _metaSchemaRepository;

    public C4DataSeeder(IMetaSchemaRepository metaSchemaRepository)
    {
        _metaSchemaRepository = metaSchemaRepository;
    }

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var existing = await _metaSchemaRepository.GetByIdAsync(
            C4MetaSchemaDefinition.SchemaId, ct);

        if (existing is not null)
            return;

        var c4Schema = C4MetaSchemaDefinition.Create();
        await _metaSchemaRepository.CreateAsync(c4Schema, ct);
    }
}
