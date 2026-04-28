namespace FlowConsole.Cli.Hosting;

public static class AssetMime
{
    public static string Resolve(string extension) => extension switch
    {
        ".js" or ".mjs" => "application/javascript",
        ".css" => "text/css",
        ".wasm" => "application/wasm",
        ".html" => "text/html; charset=utf-8",
        ".json" => "application/json",
        ".png" => "image/png",
        ".svg" => "image/svg+xml",
        ".woff2" => "font/woff2",
        _ => "application/octet-stream",
    };
}
