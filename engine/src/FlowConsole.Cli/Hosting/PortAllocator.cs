using System.Net;
using System.Net.Sockets;
using FlowConsole.Cli.Infrastructure;

namespace FlowConsole.Cli.Hosting;

public static class PortAllocator
{
    public static int FindEphemeralPort()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }

    public static int ResolvePort(int? explicitPort)
    {
        if (explicitPort is not { } port)
            return FindEphemeralPort();

        try
        {
            using var listener = new TcpListener(IPAddress.Loopback, port);
            listener.Start();
            listener.Stop();
            return port;
        }
        catch (SocketException ex) when (ex.SocketErrorCode == SocketError.AddressAlreadyInUse)
        {
            CliConsole.Error($"Port {port} is already in use. Try a different port or omit --port to auto-select.");
            Environment.Exit(5);
            return 0; // unreachable
        }
    }
}
