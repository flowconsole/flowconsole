using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Scanners.Core;
using FlowConsole.Scanners.CSharp;

namespace FlowConsole.Scanners.CSharp.Tests.Unit;

/// <summary>
/// Unit tests for the architecture-aware CSharpCodeParser.
/// The parser now produces arch:* elements instead of code:* elements.
/// </summary>
public sealed class CSharpCodeParserTests : IDisposable
{
    private readonly string _fixtureDir;
    private readonly CSharpCodeParser _parser;

    public CSharpCodeParserTests()
    {
        _fixtureDir = Directory.CreateTempSubdirectory("cs_test_").FullName;

        // Copy the fixture source file
        var sourcePath = Path.Combine(AppContext.BaseDirectory, "Unit", "Fixtures", "SampleController.cs");
        File.Copy(sourcePath, Path.Combine(_fixtureDir, "SampleController.cs"));

        // Create a .csproj so the architecture-aware parser can discover this project
        File.WriteAllText(Path.Combine(_fixtureDir, "SampleApp.csproj"),
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """);

        _parser = new CSharpCodeParser(new NoOpAdjudicator());
    }

    public void Dispose()
    {
        if (Directory.Exists(_fixtureDir))
            Directory.Delete(_fixtureDir, true);
    }

    [Fact]
    public void Language_IsCsharp()
    {
        Assert.Equal("csharp", _parser.Language);
    }

    [Fact]
    public void FileExtensions_IncludeCs()
    {
        Assert.Contains(".cs", _parser.FileExtensions);
    }

    [Fact]
    public async Task ParseProjectAsync_ProducesArchServiceElement()
    {
        var ir = await _parser.ParseProjectAsync(_fixtureDir, CodeParserOptions.Default);

        // Architecture-aware parser produces Service kind for web SDK projects
        var services = ir.Elements.Where(e => e.Kind == ElementKind.Service).ToList();
        Assert.NotEmpty(services);
        Assert.Contains(services, e => e.Name == "SampleApp");
    }

    [Fact]
    public async Task ParseProjectAsync_DetectsHttpApiCapability()
    {
        var ir = await _parser.ParseProjectAsync(_fixtureDir, CodeParserOptions.Default);

        // Should detect HTTP API capability and produce Endpoint kind element
        var apiElements = ir.Elements.Where(e => e.Kind == ElementKind.Endpoint).ToList();
        Assert.NotEmpty(apiElements);
    }

    [Fact]
    public async Task ParseProjectAsync_ProducesExposesRelationship()
    {
        var ir = await _parser.ParseProjectAsync(_fixtureDir, CodeParserOptions.Default);

        var exposesRels = ir.Relationships.Where(r => r.Kind == RelationKind.Exposes).ToList();
        Assert.NotEmpty(exposesRels);
    }

    [Fact]
    public async Task ParseProjectAsync_ElementsHaveConfidenceProperty()
    {
        var ir = await _parser.ParseProjectAsync(_fixtureDir, CodeParserOptions.Default);

        foreach (var element in ir.Elements)
        {
            Assert.True(element.Properties.ContainsKey("confidence"),
                $"Element {element.Id.Value} ({element.Kind}) missing confidence property");
        }
    }

    [Fact]
    public async Task ParseProjectAsync_SourceIsCodeScan()
    {
        var ir = await _parser.ParseProjectAsync(_fixtureDir, CodeParserOptions.Default);

        Assert.Equal(ElementSource.CodeScan, ir.Source);
    }

    [Fact]
    public async Task ParseProjectAsync_NoCodeTypeElements()
    {
        var ir = await _parser.ParseProjectAsync(_fixtureDir, CodeParserOptions.Default);

        // Architecture-aware parser should produce Service/Endpoint/Worker kinds, not Class/Interface
        Assert.DoesNotContain(ir.Elements, e => e.Kind == ElementKind.Class || e.Kind == ElementKind.Interface);
    }

    [Fact]
    public async Task ParseProjectAsync_EmptyDir_ReturnsEmptyIr()
    {
        var emptyDir = Directory.CreateTempSubdirectory("cs_empty_").FullName;
        try
        {
            var ir = await _parser.ParseProjectAsync(emptyDir, CodeParserOptions.Default);
            Assert.Empty(ir.Elements);
            Assert.Empty(ir.Relationships);
        }
        finally
        {
            Directory.Delete(emptyDir, true);
        }
    }
}
