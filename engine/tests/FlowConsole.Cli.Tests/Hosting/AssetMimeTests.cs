using FlowConsole.Cli.Hosting;

namespace FlowConsole.Cli.Tests.Hosting;

public sealed class AssetMimeTests
{
    [Theory]
    [InlineData(".js", "application/javascript")]
    [InlineData(".mjs", "application/javascript")]
    [InlineData(".css", "text/css")]
    [InlineData(".wasm", "application/wasm")]
    [InlineData(".html", "text/html; charset=utf-8")]
    [InlineData(".json", "application/json")]
    [InlineData(".png", "image/png")]
    [InlineData(".svg", "image/svg+xml")]
    [InlineData(".woff2", "font/woff2")]
    public void Resolve_KnownExtensions_ReturnsCorrectMime(string extension, string expected)
    {
        AssetMime.Resolve(extension).Should().Be(expected);
    }

    [Theory]
    [InlineData(".xyz")]
    [InlineData(".bin")]
    [InlineData("")]
    public void Resolve_UnknownExtensions_ReturnsOctetStream(string extension)
    {
        AssetMime.Resolve(extension).Should().Be("application/octet-stream");
    }
}
