using FlowConsole.Scanners.CSharp;

namespace FlowConsole.Scanners.CSharp.Tests.Unit;

public sealed class CSharpProjectFileParserTests : IDisposable
{
    private readonly string _tempDir;

    public CSharpProjectFileParserTests()
    {
        _tempDir = Directory.CreateTempSubdirectory("csproj_test_").FullName;
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, true);
    }

    [Fact]
    public void Parse_WebAppProject_ExtractsSdkAndFramework()
    {
        var csprojPath = WriteCsproj("WebApp.csproj", """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """);

        var result = CSharpProjectFileParser.Parse(csprojPath);

        Assert.Equal("WebApp", result.Name);
        Assert.Equal("Microsoft.NET.Sdk.Web", result.Sdk);
        Assert.Equal("net10.0", result.TargetFramework);
        Assert.False(result.IsTestProject);
    }

    [Fact]
    public void Parse_ExtractsOutputType()
    {
        var csprojPath = WriteCsproj("Console.csproj", """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <OutputType>Exe</OutputType>
                <TargetFramework>net10.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """);

        var result = CSharpProjectFileParser.Parse(csprojPath);

        Assert.Equal("Exe", result.OutputType);
    }

    [Fact]
    public void Parse_ExtractsPackageReferences()
    {
        var csprojPath = WriteCsproj("Lib.csproj", """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
              </PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
                <PackageReference Include="Serilog" Version="3.0.0" />
              </ItemGroup>
            </Project>
            """);

        var result = CSharpProjectFileParser.Parse(csprojPath);

        Assert.Equal(2, result.PackageReferences.Count);
        Assert.Contains("Newtonsoft.Json", result.PackageReferences);
        Assert.Contains("Serilog", result.PackageReferences);
    }

    [Fact]
    public void Parse_ExtractsProjectReferences()
    {
        var csprojPath = WriteCsproj("Api.csproj", """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
              </PropertyGroup>
              <ItemGroup>
                <ProjectReference Include="..\Core\Core.csproj" />
                <ProjectReference Include="..\Infra\Infra.csproj" />
              </ItemGroup>
            </Project>
            """);

        var result = CSharpProjectFileParser.Parse(csprojPath);

        Assert.Equal(2, result.ProjectReferences.Count);
    }

    [Fact]
    public void Parse_TestProject_DetectedByExplicitProperty()
    {
        var csprojPath = WriteCsproj("Tests.csproj", """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <IsTestProject>true</IsTestProject>
              </PropertyGroup>
            </Project>
            """);

        var result = CSharpProjectFileParser.Parse(csprojPath);

        Assert.True(result.IsTestProject);
    }

    [Fact]
    public void Parse_TestProject_DetectedByTestPackages()
    {
        var csprojPath = WriteCsproj("UnitTests.csproj", """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
              </PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.8.0" />
                <PackageReference Include="xunit" Version="2.6.0" />
                <PackageReference Include="xunit.runner.visualstudio" Version="2.5.0" />
              </ItemGroup>
            </Project>
            """);

        var result = CSharpProjectFileParser.Parse(csprojPath);

        Assert.True(result.IsTestProject);
    }

    [Fact]
    public void Parse_TestProject_DetectedByXunitV3Package()
    {
        var csprojPath = WriteCsproj("FunctionalTests.csproj", """
            <Project Sdk="Aspire.AppHost.Sdk/13.0.0">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <OutputType>Exe</OutputType>
              </PropertyGroup>
              <ItemGroup>
                <PackageReference Include="xunit.v3.mtp-v2" Version="1.0.0" />
              </ItemGroup>
            </Project>
            """);

        var result = CSharpProjectFileParser.Parse(csprojPath);

        Assert.True(result.IsTestProject);
    }

    [Fact]
    public void Parse_ProjectInTestsFolder_DetectedByConvention()
    {
        var testsDir = Path.Combine(_tempDir, "tests", "UnitTests");
        Directory.CreateDirectory(testsDir);
        var csprojPath = Path.Combine(testsDir, "UnitTests.csproj");
        File.WriteAllText(csprojPath, """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <OutputType>Exe</OutputType>
              </PropertyGroup>
            </Project>
            """);

        var result = CSharpProjectFileParser.Parse(csprojPath);

        Assert.True(result.IsTestProject);
    }

    [Fact]
    public void Parse_NonTestProject_NotFlaggedAsTest()
    {
        var csprojPath = WriteCsproj("Domain.csproj", """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
              </PropertyGroup>
              <ItemGroup>
                <PackageReference Include="MediatR" Version="12.0.0" />
              </ItemGroup>
            </Project>
            """);

        var result = CSharpProjectFileParser.Parse(csprojPath);

        Assert.False(result.IsTestProject);
    }

    [Fact]
    public void Parse_IsPackable_ExtractedCorrectly()
    {
        var csprojPath = WriteCsproj("Shared.csproj", """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <IsPackable>false</IsPackable>
              </PropertyGroup>
            </Project>
            """);

        var result = CSharpProjectFileParser.Parse(csprojPath);

        Assert.False(result.IsPackable);
    }

    [Fact]
    public void Parse_TargetFrameworks_MultiTarget()
    {
        var csprojPath = WriteCsproj("Multi.csproj", """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFrameworks>net8.0;net10.0</TargetFrameworks>
              </PropertyGroup>
            </Project>
            """);

        var result = CSharpProjectFileParser.Parse(csprojPath);

        Assert.Equal("net8.0;net10.0", result.TargetFramework);
    }

    [Fact]
    public void Parse_PathIsFullyResolved()
    {
        var csprojPath = WriteCsproj("App.csproj", """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """);

        var result = CSharpProjectFileParser.Parse(csprojPath);

        Assert.Equal(Path.GetFullPath(csprojPath), result.Path);
    }

    private string WriteCsproj(string fileName, string content)
    {
        var path = Path.Combine(_tempDir, fileName);
        File.WriteAllText(path, content);
        return path;
    }
}
