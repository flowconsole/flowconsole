using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Scanners.Core;
using FlowConsole.Scanners.CSharp;

namespace FlowConsole.Scanners.CSharp.Tests.Unit;

/// <summary>
/// Integration tests verifying CSharpCodeParser works through the extracted library
/// without any backend dependencies (no Postgres/AGE/Ollama).
/// </summary>
public sealed class CSharpScannerIntegrationTests : IDisposable
{
    private readonly string _fixtureDir;

    public CSharpScannerIntegrationTests()
    {
        _fixtureDir = Directory.CreateTempSubdirectory("scanner_integration_").FullName;

        // Minimal .csproj fixture
        File.WriteAllText(Path.Combine(_fixtureDir, "TestService.csproj"),
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """);

        // Minimal C# source with a controller
        File.WriteAllText(Path.Combine(_fixtureDir, "TestController.cs"),
            """
            using Microsoft.AspNetCore.Mvc;

            namespace TestService;

            [ApiController]
            [Route("api/[controller]")]
            public class TestController : ControllerBase
            {
                [HttpGet]
                public IActionResult Get() => Ok();
            }
            """);
    }

    public void Dispose()
    {
        if (Directory.Exists(_fixtureDir))
            Directory.Delete(_fixtureDir, true);
    }

    [Fact]
    public async Task Parser_WithNoOpAdjudicator_ProducesSnapshot()
    {
        var parser = new CSharpCodeParser(new NoOpAdjudicator());

        var snapshot = await parser.ParseProjectAsync(_fixtureDir, CodeParserOptions.Default);

        Assert.Equal(ElementSource.CodeScan, snapshot.Source);
        Assert.NotEmpty(snapshot.Elements);
    }

    [Fact]
    public void Parser_ImplementsBothICodeParserInterfaces()
    {
        var parser = new CSharpCodeParser(new NoOpAdjudicator());

        Assert.IsAssignableFrom<FlowConsole.Scanners.Core.ICodeParser>(parser);
        Assert.IsAssignableFrom<FlowConsole.Core.Interfaces.ICodeParser>(parser);
    }

    [Fact]
    public void Parser_RequiresAdjudicator()
    {
        Assert.Throws<ArgumentNullException>(() => new CSharpCodeParser(null!));
    }

    [Fact]
    public void Constructor_AcceptsNoOpAdjudicator()
    {
        var adjudicator = new NoOpAdjudicator();
        var parser = new CSharpCodeParser(adjudicator);

        Assert.Equal("csharp", parser.Language);
    }
}
