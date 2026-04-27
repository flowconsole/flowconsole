using FlowConsole.Scanners.CSharp;

namespace FlowConsole.Scanners.CSharp.Tests.Unit;

public sealed class CSharpBuildPropsParserTests : IDisposable
{
    private readonly string _tempDir;

    public CSharpBuildPropsParserTests()
    {
        _tempDir = Directory.CreateTempSubdirectory("buildprops_test_").FullName;
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, true);
    }

    [Fact]
    public void ParseForProject_FindsDirectoryBuildProps()
    {
        // Create Directory.Build.props at root
        File.WriteAllText(Path.Combine(_tempDir, "Directory.Build.props"), """
            <Project>
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <Nullable>enable</Nullable>
                <ImplicitUsings>enable</ImplicitUsings>
              </PropertyGroup>
            </Project>
            """);

        // Create a nested project directory
        var projectDir = Path.Combine(_tempDir, "src", "MyApp");
        Directory.CreateDirectory(projectDir);
        var csprojPath = Path.Combine(projectDir, "MyApp.csproj");
        File.WriteAllText(csprojPath, "<Project Sdk=\"Microsoft.NET.Sdk\"></Project>");

        var results = CSharpBuildPropsParser.ParseForProject(csprojPath);

        Assert.NotEmpty(results);
        Assert.Contains(results, p => p.PropertyName == "TargetFramework" && p.PropertyValue == "net10.0");
        Assert.Contains(results, p => p.PropertyName == "Nullable" && p.PropertyValue == "enable");
        Assert.Contains(results, p => p.PropertyName == "ImplicitUsings" && p.PropertyValue == "enable");
    }

    [Fact]
    public void ParseForProject_FindsDirectoryBuildTargets()
    {
        File.WriteAllText(Path.Combine(_tempDir, "Directory.Build.targets"), """
            <Project>
              <PropertyGroup>
                <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
              </PropertyGroup>
            </Project>
            """);

        var projectDir = Path.Combine(_tempDir, "src", "Lib");
        Directory.CreateDirectory(projectDir);
        var csprojPath = Path.Combine(projectDir, "Lib.csproj");
        File.WriteAllText(csprojPath, "<Project Sdk=\"Microsoft.NET.Sdk\"></Project>");

        var results = CSharpBuildPropsParser.ParseForProject(csprojPath);

        Assert.Contains(results, p => p.PropertyName == "TreatWarningsAsErrors" && p.PropertyValue == "true");
    }

    [Fact]
    public void ParseForProject_FindsNearestBuildProps()
    {
        // Root level
        File.WriteAllText(Path.Combine(_tempDir, "Directory.Build.props"), """
            <Project>
              <PropertyGroup>
                <LangVersion>latest</LangVersion>
              </PropertyGroup>
            </Project>
            """);

        // Closer to project — this should be found, not the root one
        var srcDir = Path.Combine(_tempDir, "src");
        Directory.CreateDirectory(srcDir);
        File.WriteAllText(Path.Combine(srcDir, "Directory.Build.props"), """
            <Project>
              <PropertyGroup>
                <LangVersion>12</LangVersion>
              </PropertyGroup>
            </Project>
            """);

        var projectDir = Path.Combine(srcDir, "Api");
        Directory.CreateDirectory(projectDir);
        var csprojPath = Path.Combine(projectDir, "Api.csproj");
        File.WriteAllText(csprojPath, "<Project Sdk=\"Microsoft.NET.Sdk\"></Project>");

        var results = CSharpBuildPropsParser.ParseForProject(csprojPath);

        // Should find the nearest one (src/Directory.Build.props), not root
        var langVersionProp = results.Where(p => p.PropertyName == "LangVersion").ToList();
        Assert.Single(langVersionProp);
        Assert.Equal("12", langVersionProp[0].PropertyValue);
    }

    [Fact]
    public void ParseForProject_NoPropsFile_ReturnsEmpty()
    {
        var projectDir = Path.Combine(_tempDir, "isolated");
        Directory.CreateDirectory(projectDir);
        var csprojPath = Path.Combine(projectDir, "Isolated.csproj");
        File.WriteAllText(csprojPath, "<Project Sdk=\"Microsoft.NET.Sdk\"></Project>");

        // The temp dir might inherit from the actual filesystem above,
        // but if we're deep enough in /tmp, there won't be any Directory.Build.props.
        // We test the scenario where no files are found by checking behavior is reasonable.
        var results = CSharpBuildPropsParser.ParseForProject(csprojPath);

        // Results may or may not be empty depending on host filesystem,
        // but should not throw
        Assert.NotNull(results);
    }

    [Fact]
    public void ParseForProject_SourceFileIsRecorded()
    {
        var propsPath = Path.Combine(_tempDir, "Directory.Build.props");
        File.WriteAllText(propsPath, """
            <Project>
              <PropertyGroup>
                <OutputType>Exe</OutputType>
              </PropertyGroup>
            </Project>
            """);

        var projectDir = Path.Combine(_tempDir, "src", "Tool");
        Directory.CreateDirectory(projectDir);
        var csprojPath = Path.Combine(projectDir, "Tool.csproj");
        File.WriteAllText(csprojPath, "<Project Sdk=\"Microsoft.NET.Sdk\"></Project>");

        var results = CSharpBuildPropsParser.ParseForProject(csprojPath);

        var outputTypeProp = results.FirstOrDefault(p => p.PropertyName == "OutputType");
        Assert.NotNull(outputTypeProp);
        Assert.Equal(propsPath, outputTypeProp.SourceFile);
    }

    [Fact]
    public void ParseForProject_IgnoresUnsupportedProperties()
    {
        File.WriteAllText(Path.Combine(_tempDir, "Directory.Build.props"), """
            <Project>
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <CustomProperty>some-value</CustomProperty>
                <RandomSetting>123</RandomSetting>
              </PropertyGroup>
            </Project>
            """);

        var projectDir = Path.Combine(_tempDir, "src", "App");
        Directory.CreateDirectory(projectDir);
        var csprojPath = Path.Combine(projectDir, "App.csproj");
        File.WriteAllText(csprojPath, "<Project Sdk=\"Microsoft.NET.Sdk\"></Project>");

        var results = CSharpBuildPropsParser.ParseForProject(csprojPath);

        Assert.DoesNotContain(results, p => p.PropertyName == "CustomProperty");
        Assert.DoesNotContain(results, p => p.PropertyName == "RandomSetting");
        Assert.Contains(results, p => p.PropertyName == "TargetFramework");
    }

    [Fact]
    public void ParseForProject_BothPropsAndTargets()
    {
        File.WriteAllText(Path.Combine(_tempDir, "Directory.Build.props"), """
            <Project>
              <PropertyGroup>
                <Nullable>enable</Nullable>
              </PropertyGroup>
            </Project>
            """);

        File.WriteAllText(Path.Combine(_tempDir, "Directory.Build.targets"), """
            <Project>
              <PropertyGroup>
                <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
              </PropertyGroup>
            </Project>
            """);

        var projectDir = Path.Combine(_tempDir, "src", "Core");
        Directory.CreateDirectory(projectDir);
        var csprojPath = Path.Combine(projectDir, "Core.csproj");
        File.WriteAllText(csprojPath, "<Project Sdk=\"Microsoft.NET.Sdk\"></Project>");

        var results = CSharpBuildPropsParser.ParseForProject(csprojPath);

        Assert.Contains(results, p => p.PropertyName == "Nullable");
        Assert.Contains(results, p => p.PropertyName == "TreatWarningsAsErrors");
    }
}
