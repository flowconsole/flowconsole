using System.Net;
using System.Reflection;
using System.Text;
using System.Text.Json;
using FlowConsole.Cli.Infrastructure;

namespace FlowConsole.Cli.Hosting;

internal sealed partial class ViewerHost : IDisposable
{
    private readonly HttpListener _listener = new();
    private readonly string _snapshotPath;
    private readonly long _maxBytes;
    private readonly int _port;
    private readonly Func<(long Version, string State, string? LastError)>? _statusProvider;

    private const string ResourcePrefix = "FlowConsole.Cli.Resources.web.";

    public ViewerHost(string snapshotPath, long maxBytes, int port,
        Func<(long Version, string State, string? LastError)>? statusProvider = null)
    {
        _snapshotPath = snapshotPath;
        _maxBytes = maxBytes;
        _port = port;
        _statusProvider = statusProvider;
        _listener.Prefixes.Add($"http://127.0.0.1:{port}/");
    }

    public int Port => _port;

    public void Start()
    {
        _listener.Start();
    }

    public async Task RunAsync(CancellationToken ct)
    {
        if (!_listener.IsListening)
            _listener.Start();
        ct.Register(() => _listener.Stop());

        while (!ct.IsCancellationRequested)
        {
            HttpListenerContext context;
            try
            {
                context = await _listener.GetContextAsync();
            }
            catch (HttpListenerException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (ObjectDisposedException)
            {
                break;
            }

            try
            {
                await HandleRequest(context);
            }
            catch (HttpListenerException)
            {
            }
            catch (IOException)
            {
                try { context.Response.Abort(); } catch (ObjectDisposedException) { }
            }
        }
    }

    private async Task HandleRequest(HttpListenerContext context)
    {
        var path = context.Request.Url?.AbsolutePath ?? "/";
        var response = context.Response;

        if (path == "/" || path == "/index.html")
        {
            await ServeEmbeddedResource(response, "index.html", "text/html; charset=utf-8", "no-cache");
            return;
        }

        if (path == "/api/snapshot")
        {
            await ServeSnapshot(response);
            return;
        }

        if (path == "/api/status")
        {
            ServeStatus(response);
            return;
        }

        if (path.StartsWith("/assets/", StringComparison.Ordinal))
        {
            var assetName = path["/assets/".Length..];
            var assembly = typeof(ViewerHost).Assembly;
            var resourceName = ResolveResourceName(assembly, assetName);

            if (resourceName is null)
            {
                response.StatusCode = 404;
                response.Close();
                return;
            }

            using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream is null)
            {
                response.StatusCode = 404;
                response.Close();
                return;
            }

            var ext = System.IO.Path.GetExtension(assetName);
            response.ContentType = AssetMime.Resolve(ext);
            response.Headers.Set("Cache-Control", "public, max-age=31536000, immutable");
            response.ContentLength64 = stream.Length;
            await stream.CopyToAsync(response.OutputStream);
            response.Close();
            return;
        }

        response.StatusCode = 404;
        response.Close();
    }

    private void ServeStatus(HttpListenerResponse response)
    {
        if (_statusProvider is null)
        {
            // Plain `fcon view` sessions have no watch state; the viewer
            // treats 404 as "no watch" and disables status polling.
            response.StatusCode = 404;
            response.Close();
            return;
        }

        var (version, state, lastError) = _statusProvider();
        var payload = JsonSerializer.Serialize(
            new StatusPayload(version, state, lastError),
            ViewerJsonContext.Default.StatusPayload);

        var bytes = Encoding.UTF8.GetBytes(payload);
        response.ContentType = "application/json";
        response.Headers.Set("Cache-Control", "no-store");
        response.ContentLength64 = bytes.Length;
        response.OutputStream.Write(bytes, 0, bytes.Length);
        response.Close();
    }

    internal sealed record StatusPayload(long Version, string State, string? LastError);

    private async Task ServeSnapshot(HttpListenerResponse response)
    {
        FileStream fs;
        try
        {
            fs = new FileStream(_snapshotPath, FileMode.Open, FileAccess.Read,
                FileShare.ReadWrite | FileShare.Delete);
        }
        catch (FileNotFoundException)
        {
            response.StatusCode = 404;
            response.Close();
            return;
        }
        catch (IOException)
        {
            response.StatusCode = 503;
            response.Close();
            return;
        }

        await using (fs)
        {
            var length = fs.Length;
            if (length > _maxBytes)
            {
                response.StatusCode = 413;
                response.Close();
                return;
            }

            response.ContentType = "application/json";
            response.Headers.Set("Cache-Control", "no-store");
            response.ContentLength64 = length;
            await fs.CopyToAsync(response.OutputStream);
            response.Close();
        }
    }

    private async Task ServeEmbeddedResource(HttpListenerResponse response, string fileName, string contentType, string cacheControl)
    {
        var resourceName = ResourcePrefix + fileName;
        var assembly = typeof(ViewerHost).Assembly;
        using var stream = assembly.GetManifestResourceStream(resourceName);

        if (stream is null)
        {
            response.StatusCode = 404;
            response.Close();
            return;
        }

        response.ContentType = contentType;
        response.Headers.Set("Cache-Control", cacheControl);
        response.ContentLength64 = stream.Length;
        await stream.CopyToAsync(response.OutputStream);
        response.Close();
    }

    private static string? ResolveResourceName(Assembly assembly, string assetFileName)
    {
        var directName = ResourcePrefix + "assets." + assetFileName;
        if (assembly.GetManifestResourceInfo(directName) is not null)
            return directName;

        // .NET embeds hyphens as-is but dots in filenames become namespace separators.
        // Vite hashes can contain dots (e.g. index-CxH3q.2B.js). Try suffix match
        // against all resources to handle mangled names.
        var prefix = ResourcePrefix + "assets.";
        foreach (var name in assembly.GetManifestResourceNames())
        {
            if (!name.StartsWith(prefix, StringComparison.Ordinal))
                continue;

            var resourceSuffix = name[prefix.Length..];
            if (string.Equals(resourceSuffix, assetFileName, StringComparison.OrdinalIgnoreCase))
                return name;
        }

        return null;
    }

    public void Dispose()
    {
        if (_listener.IsListening)
            _listener.Stop();
        _listener.Close();
    }
}

[System.Text.Json.Serialization.JsonSourceGenerationOptions(
    PropertyNamingPolicy = System.Text.Json.Serialization.JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
[System.Text.Json.Serialization.JsonSerializable(typeof(ViewerHost.StatusPayload))]
internal sealed partial class ViewerJsonContext : System.Text.Json.Serialization.JsonSerializerContext;
