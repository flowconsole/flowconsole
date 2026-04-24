namespace FlowConsole.Schema;

public interface IDataSeeder
{
    Task SeedAsync(CancellationToken ct = default);
}
