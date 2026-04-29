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

public sealed class PortAccessDeniedException : Exception
{
    public PortAccessDeniedException(int port)
        : base($"Access denied for port {port}. Ports below 1024 typically require elevated privileges.")
    {
        RequestedPort = port;
    }

    public int RequestedPort { get; }
}

public static class PortAllocator
{
    private const int AutoPortRetries = 5;

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

        if (port is < 1 or > 65535)
            throw new ArgumentOutOfRangeException(nameof(explicitPort), port, "Port must be between 1 and 65535.");

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
        catch (SocketException ex) when (ex.SocketErrorCode == SocketError.AccessDenied)
        {
            throw new PortAccessDeniedException(port);
        }
    }

    public static int ResolvePortWithRetry(int? explicitPort)
    {
        if (explicitPort is not null and not 0)
            return ResolvePort(explicitPort);

        for (var i = 0; i < AutoPortRetries; i++)
        {
            var candidate = FindEphemeralPort();
            try
            {
                using var probe = new TcpListener(IPAddress.Loopback, candidate);
                probe.Start();
                probe.Stop();
                return candidate;
            }
            catch (SocketException ex) when (ex.SocketErrorCode == SocketError.AddressAlreadyInUse)
            {
                // Port was claimed between FindEphemeralPort and probe — retry with a new port
            }
        }

        return FindEphemeralPort();
    }
}
