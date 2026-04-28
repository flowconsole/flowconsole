using FlowConsole.Cli.Commands;

namespace FlowConsole.Cli.Tests.Commands;

public sealed class ViewCommandTests
{
    [Fact]
    public void ViewSettings_Port_Parsed()
    {
        var settings = new ViewSettings { Port = 8080 };
        settings.Port.Should().Be(8080);
    }

    [Fact]
    public void ViewSettings_Port_DefaultNull()
    {
        var settings = new ViewSettings();
        settings.Port.Should().BeNull();
    }

    [Fact]
    public void ViewSettings_NoOpen_Parsed()
    {
        var settings = new ViewSettings { NoOpen = true };
        settings.NoOpen.Should().BeTrue();
    }

    [Fact]
    public void ViewSettings_Source_Parsed()
    {
        var settings = new ViewSettings { Source = "scan" };
        settings.Source.Should().Be("scan");
    }

    [Fact]
    public void ViewSettings_Path_OptionalEmpty()
    {
        var settings = new ViewSettings();
        settings.Path.Should().BeNull();
    }

    [Fact]
    public void ViewSettings_Path_ExplicitValue()
    {
        var settings = new ViewSettings { Path = "/tmp/snapshot.json" };
        settings.Path.Should().Be("/tmp/snapshot.json");
    }

    [Fact]
    public void ViewSettings_MaxSnapshotBytes_Default()
    {
        var settings = new ViewSettings();
        settings.MaxSnapshotBytes.Should().Be(200 * 1024 * 1024);
    }

    [Fact]
    public void ViewSettings_MaxSnapshotBytes_CustomValue()
    {
        var settings = new ViewSettings { MaxSnapshotBytes = 50 * 1024 * 1024 };
        settings.MaxSnapshotBytes.Should().Be(50 * 1024 * 1024);
    }
}
