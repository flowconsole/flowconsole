using FlowConsole.Scanners.CSharp;

namespace FlowConsole.Scanners.CSharp.Tests.Unit;

public sealed class CSharpSolutionFileParserTests : IDisposable
{
    private readonly string _tempDir;

    public CSharpSolutionFileParserTests()
    {
        _tempDir = Directory.CreateTempSubdirectory("sln_test_").FullName;
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, true);
    }

    [Fact]
    public void Parse_SlnFile_ExtractsProjectEntries()
    {
        var slnPath = Path.Combine(_tempDir, "Test.sln");
        File.WriteAllText(slnPath, """
            Microsoft Visual Studio Solution File, Format Version 12.00
            # Visual Studio Version 17
            Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "MyApp", "src\MyApp\MyApp.csproj", "{AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA}"
            EndProject
            Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "MyApp.Tests", "tests\MyApp.Tests\MyApp.Tests.csproj", "{BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB}"
            EndProject
            Global
            EndGlobal
            """);

        var result = CSharpSolutionFileParser.Parse(slnPath);

        Assert.Equal(Path.GetFullPath(slnPath), result.SolutionPath);
        Assert.Equal(2, result.Projects.Count);
        Assert.Contains(result.Projects, p => p.Name == "MyApp");
        Assert.Contains(result.Projects, p => p.Name == "MyApp.Tests");
    }

    [Fact]
    public void Parse_SlnFile_ResolvesAbsolutePaths()
    {
        var slnPath = Path.Combine(_tempDir, "Test.sln");
        File.WriteAllText(slnPath, """
            Microsoft Visual Studio Solution File, Format Version 12.00
            Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Lib", "src\Lib\Lib.csproj", "{CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC}"
            EndProject
            """);

        var result = CSharpSolutionFileParser.Parse(slnPath);

        var project = Assert.Single(result.Projects);
        var expectedAbsolute = Path.GetFullPath(Path.Combine(_tempDir, "src", "Lib", "Lib.csproj"));
        Assert.Equal(expectedAbsolute, project.AbsolutePath);
    }

    [Fact]
    public void Parse_SlnFile_SkipsSolutionFolders()
    {
        var slnPath = Path.Combine(_tempDir, "Test.sln");
        File.WriteAllText(slnPath, """
            Microsoft Visual Studio Solution File, Format Version 12.00
            Project("{2150E333-8FDC-42A3-9474-1A3956D46DE8}") = "src", "src", "{DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD}"
            EndProject
            Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Api", "src\Api\Api.csproj", "{EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE}"
            EndProject
            """);

        var result = CSharpSolutionFileParser.Parse(slnPath);

        var project = Assert.Single(result.Projects);
        Assert.Equal("Api", project.Name);
    }

    [Fact]
    public void Parse_SlnxFile_ExtractsProjectEntries()
    {
        var slnxPath = Path.Combine(_tempDir, "Test.slnx");
        File.WriteAllText(slnxPath, """
            <Solution>
              <Project Path="src/MyApp/MyApp.csproj" />
              <Project Path="tests/MyApp.Tests/MyApp.Tests.csproj" />
            </Solution>
            """);

        var result = CSharpSolutionFileParser.Parse(slnxPath);

        Assert.Equal(Path.GetFullPath(slnxPath), result.SolutionPath);
        Assert.Equal(2, result.Projects.Count);
        Assert.Contains(result.Projects, p => p.Name == "MyApp");
        Assert.Contains(result.Projects, p => p.Name == "MyApp.Tests");
    }

    [Fact]
    public void Parse_SlnxFile_ResolvesAbsolutePaths()
    {
        var slnxPath = Path.Combine(_tempDir, "Test.slnx");
        File.WriteAllText(slnxPath, """
            <Solution>
              <Project Path="src/Core/Core.csproj" />
            </Solution>
            """);

        var result = CSharpSolutionFileParser.Parse(slnxPath);

        var project = Assert.Single(result.Projects);
        var expectedAbsolute = Path.GetFullPath(Path.Combine(_tempDir, "src", "Core", "Core.csproj"));
        Assert.Equal(expectedAbsolute, project.AbsolutePath);
    }

    [Fact]
    public void Parse_SlnxFile_NestedFolders()
    {
        var slnxPath = Path.Combine(_tempDir, "Test.slnx");
        File.WriteAllText(slnxPath, """
            <Solution>
              <Folder Name="src">
                <Project Path="src/Api/Api.csproj" />
              </Folder>
              <Folder Name="tests">
                <Project Path="tests/Api.Tests/Api.Tests.csproj" />
              </Folder>
            </Solution>
            """);

        var result = CSharpSolutionFileParser.Parse(slnxPath);

        Assert.Equal(2, result.Projects.Count);
        Assert.Contains(result.Projects, p => p.Name == "Api");
        Assert.Contains(result.Projects, p => p.Name == "Api.Tests");
    }

    [Fact]
    public void Parse_SlnFile_EmptySolution_ReturnsEmptyProjects()
    {
        var slnPath = Path.Combine(_tempDir, "Empty.sln");
        File.WriteAllText(slnPath, """
            Microsoft Visual Studio Solution File, Format Version 12.00
            Global
            EndGlobal
            """);

        var result = CSharpSolutionFileParser.Parse(slnPath);

        Assert.Empty(result.Projects);
    }
}
