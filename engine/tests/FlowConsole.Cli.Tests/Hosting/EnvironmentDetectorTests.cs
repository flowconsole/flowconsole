using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Tests.Commands;

namespace FlowConsole.Cli.Tests.Hosting;

[Collection(ConsoleTestCollection.Name)]
public sealed class EnvironmentDetectorTests
{
    [Fact]
    public void IsCI_WhenCIEnvNotSet_ReturnsFalse()
    {
        var original = Environment.GetEnvironmentVariable("CI");
        try
        {
            Environment.SetEnvironmentVariable("CI", null);
            EnvironmentDetector.IsCI.Should().BeFalse();
        }
        finally
        {
            Environment.SetEnvironmentVariable("CI", original);
        }
    }

    [Theory]
    [InlineData("true")]
    [InlineData("1")]
    [InlineData("yes")]
    public void IsCI_WhenCIEnvSet_ReturnsTrue(string value)
    {
        var original = Environment.GetEnvironmentVariable("CI");
        try
        {
            Environment.SetEnvironmentVariable("CI", value);
            EnvironmentDetector.IsCI.Should().BeTrue();
        }
        finally
        {
            Environment.SetEnvironmentVariable("CI", original);
        }
    }

    [Fact]
    public void IsCI_WhenCIEnvEmpty_ReturnsFalse()
    {
        var original = Environment.GetEnvironmentVariable("CI");
        try
        {
            Environment.SetEnvironmentVariable("CI", "");
            EnvironmentDetector.IsCI.Should().BeFalse();
        }
        finally
        {
            Environment.SetEnvironmentVariable("CI", original);
        }
    }
}
