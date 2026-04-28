using System.Net;
using System.Net.Sockets;

namespace FlowConsole.Cli.Hosting;

public sealed class PortInUseException : Exception
{
    public PortInUseException(int port)
        : base($"Port {port} is already in use. Try a different port or omit --port to auto-select.")
    {
        RequestedPort = port;
    }

    public int RequestedPort { get; }
}

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
        if (explicitPort is not { } port || port == 0)
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
            throw new PortInUseException(port);
        }
    }
}
