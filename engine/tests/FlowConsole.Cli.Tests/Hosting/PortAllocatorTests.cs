using FlowConsole.Cli.Hosting;

namespace FlowConsole.Cli.Tests.Hosting;

public sealed class PortAllocatorTests
{
    [Fact]
    public void FindEphemeralPort_ReturnsValidPort()
    {
        var port = PortAllocator.FindEphemeralPort();

        port.Should().BeInRange(1024, 65535);
    }

    [Fact]
    public void FindEphemeralPort_TwoCalls_ReturnDifferentPorts()
    {
        var port1 = PortAllocator.FindEphemeralPort();
        var port2 = PortAllocator.FindEphemeralPort();

        port1.Should().NotBe(port2);
    }

    [Fact]
    public void ResolvePort_NullPort_ReturnsEphemeralPort()
    {
        var port = PortAllocator.ResolvePort(null);

        port.Should().BeInRange(1024, 65535);
    }
}
