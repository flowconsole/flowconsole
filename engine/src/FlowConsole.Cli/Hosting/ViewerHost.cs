using System.Net;
using System.Reflection;
using FlowConsole.Cli.Infrastructure;

namespace FlowConsole.Cli.Hosting;

internal sealed class ViewerHost : IDisposable
{
    private readonly HttpListener _listener = new();
    private readonly string _snapshotPath;
    private readonly long _maxBytes;
    private readonly int _port;

    private const string ResourcePrefix = "FlowConsole.Cli.Resources.web.";

    public ViewerHost(string snapshotPath, long maxBytes, int port)
    {
        _snapshotPath = snapshotPath;
        _maxBytes = maxBytes;
        _port = port;
        _listener.Prefixes.Add($"http://127.0.0.1:{port}/");
    }

    public int Port => _port;

    public async Task RunAsync(CancellationToken ct)
    {
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
                // Client disconnected
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

    private async Task ServeSnapshot(HttpListenerResponse response)
    {
        if (!File.Exists(_snapshotPath))
        {
            response.StatusCode = 404;
            response.Close();
            return;
        }

        var fileInfo = new FileInfo(_snapshotPath);
        if (fileInfo.Length > _maxBytes)
        {
            response.StatusCode = 413;
            response.Close();
            return;
        }

        response.ContentType = "application/json";
        response.Headers.Set("Cache-Control", "no-store");

        await using var fs = new FileStream(_snapshotPath, FileMode.Open, FileAccess.Read,
            FileShare.ReadWrite | FileShare.Delete);
        response.ContentLength64 = fs.Length;
        await fs.CopyToAsync(response.OutputStream);
        response.Close();
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
