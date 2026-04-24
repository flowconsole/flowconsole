using FlowConsole.Cli.Infrastructure;

namespace FlowConsole.Cli.Tests.Infrastructure;

public sealed class ConfigDiscoveryTests : IDisposable
{
    private readonly string _tempRoot;

    public ConfigDiscoveryTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"fc-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
    }

    [Fact]
    public void FindConfigFile_ReturnsNull_WhenNoConfigExists()
    {
        var result = ConfigDiscovery.FindConfigFile(_tempRoot);

        result.Should().BeNull();
    }

    [Fact]
    public void FindConfigFile_FindsConfig_InCurrentDirectory()
    {
        var configPath = Path.Combine(_tempRoot, ConfigDiscovery.ConfigFileName);
        File.WriteAllText(configPath, "schema_version: '1.0'");

        var result = ConfigDiscovery.FindConfigFile(_tempRoot);

        result.Should().Be(configPath);
    }

    [Fact]
    public void FindConfigFile_FindsConfig_InParentDirectory_MonorepoLayout()
    {
        // Simulate: monorepo-root/.flowconsole.yaml
        //           monorepo-root/services/api/  <-- start here
        var configPath = Path.Combine(_tempRoot, ConfigDiscovery.ConfigFileName);
        File.WriteAllText(configPath, "schema_version: '1.0'");

        var subDir = Path.Combine(_tempRoot, "services", "api");
        Directory.CreateDirectory(subDir);

        var result = ConfigDiscovery.FindConfigFile(subDir);

        result.Should().Be(configPath);
    }

    [Fact]
    public void FindConfigFile_StopsAtGitRoot()
    {
        // Create a .git dir in parent — config above .git should NOT be found
        var gitRoot = Path.Combine(_tempRoot, "repo");
        Directory.CreateDirectory(gitRoot);
        Directory.CreateDirectory(Path.Combine(gitRoot, ".git"));

        // Place config ABOVE the git root (should not be found)
        File.WriteAllText(Path.Combine(_tempRoot, ConfigDiscovery.ConfigFileName), "schema_version: '1.0'");

        var subDir = Path.Combine(gitRoot, "src");
        Directory.CreateDirectory(subDir);

        var result = ConfigDiscovery.FindConfigFile(subDir);

        result.Should().BeNull();
    }

    [Fact]
    public void FindConfigFile_FindsConfig_BelowGitRoot()
    {
        var gitRoot = Path.Combine(_tempRoot, "repo");
        Directory.CreateDirectory(gitRoot);
        Directory.CreateDirectory(Path.Combine(gitRoot, ".git"));

        // Config at git root itself
        var configPath = Path.Combine(gitRoot, ConfigDiscovery.ConfigFileName);
        File.WriteAllText(configPath, "schema_version: '1.0'");

        var subDir = Path.Combine(gitRoot, "src", "api");
        Directory.CreateDirectory(subDir);

        var result = ConfigDiscovery.FindConfigFile(subDir);

        result.Should().Be(configPath);
    }

    [Fact]
    public void FindConfigFile_FirstMatchWins()
    {
        // Config in both parent and grandparent — nearest wins
        var parent = Path.Combine(_tempRoot, "level1");
        var child = Path.Combine(parent, "level2");
        Directory.CreateDirectory(child);

        File.WriteAllText(Path.Combine(_tempRoot, ConfigDiscovery.ConfigFileName), "root");
        var parentConfig = Path.Combine(parent, ConfigDiscovery.ConfigFileName);
        File.WriteAllText(parentConfig, "parent");

        var result = ConfigDiscovery.FindConfigFile(child);

        result.Should().Be(parentConfig);
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempRoot, recursive: true); }
        catch { /* best-effort cleanup */ }
    }
}
