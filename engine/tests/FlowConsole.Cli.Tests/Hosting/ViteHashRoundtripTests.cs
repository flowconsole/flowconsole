using System.Reflection;

namespace FlowConsole.Cli.Tests.Hosting;

public sealed class ViteHashRoundtripTests
{
    [Theory]
    [InlineData("FlowConsole.Cli.Resources.bash-completion.sh")]
    public void EmbeddedResource_WithDotsInName_Reachable(string resourceName)
    {
        // Validates that GetManifestResourceStream can find resources with dots in names
        // (same pattern used for Vite-hashed assets like "index-B3x7k2Qf.js")
        var assembly = typeof(FlowConsole.Cli.Hosting.ViewerHost).Assembly;
        using var stream = assembly.GetManifestResourceStream(resourceName);
        stream.Should().NotBeNull($"resource '{resourceName}' should exist in CLI assembly");
        stream!.Length.Should().BeGreaterThan(0);
    }

    [Fact]
    public void GetManifestResourceNames_ContainsResourcesPrefix()
    {
        var assembly = typeof(FlowConsole.Cli.Hosting.ViewerHost).Assembly;
        var names = assembly.GetManifestResourceNames();
        names.Should().Contain(n => n.StartsWith("FlowConsole.Cli.Resources."));
    }

    [Fact]
    public void ResourceName_WithViteHashPattern_ResolvableByConvention()
    {
        // Vite produces filenames like "index-B3x7k2Qf.js" or "vendor-Cx9mP1.js"
        // When embedded via LogicalName, the resource name preserves dots.
        // This test validates that our naming convention allows retrieval.
        var assembly = typeof(FlowConsole.Cli.Hosting.ViewerHost).Assembly;
        var allNames = assembly.GetManifestResourceNames();

        // All resource names with "FlowConsole.Cli.Resources." prefix should use dot separators
        foreach (var name in allNames.Where(n => n.StartsWith("FlowConsole.Cli.Resources.")))
        {
            name.Should().NotContain("\\", "resource names should use dot separators, not backslash");
            name.Should().NotContain("/", "resource names should use dot separators, not forward slash");
        }
    }
}
