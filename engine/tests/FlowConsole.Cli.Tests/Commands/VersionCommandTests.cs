using FlowConsole.Cli.Commands;

namespace FlowConsole.Cli.Tests.Commands;

public sealed class VersionCommandTests
{
    [Fact]
    public void GetVersion_ReturnsSemverString()
    {
        var version = VersionCommand.GetVersion();

        version.Should().NotBeNullOrWhiteSpace();
        // Should be parseable as a version (at minimum major.minor.patch)
        version.Should().MatchRegex(@"^\d+\.\d+\.\d+");
    }
}
