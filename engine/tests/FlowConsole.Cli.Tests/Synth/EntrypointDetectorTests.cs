using FlowConsole.Cli.Synth;

namespace FlowConsole.Cli.Tests.Synth;

public sealed class EntrypointDetectorTests : IDisposable
{
    private readonly string _tempRoot;

    public EntrypointDetectorTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"fc-detect-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
    }

    [Fact]
    public void SuggestSynthCommand_WithMainTs_SuggestsNodeMainTs()
    {
        var dir = CreateSubDir("ts-project");
        File.WriteAllText(Path.Combine(dir, "main.ts"), "// entry");

        var result = EntrypointDetector.SuggestSynthCommand(dir);

        result.Should().Contain("node main.ts");
    }

    [Fact]
    public void SuggestSynthCommand_WithMainTsx_SuggestsNodeMainTs()
    {
        var dir = CreateSubDir("tsx-project");
        File.WriteAllText(Path.Combine(dir, "main.tsx"), "// entry");

        var result = EntrypointDetector.SuggestSynthCommand(dir);

        result.Should().Contain("node main.ts");
    }

    [Fact]
    public void SuggestSynthCommand_WithProgramCs_SuggestsDotnetRun()
    {
        var dir = CreateSubDir("cs-project");
        File.WriteAllText(Path.Combine(dir, "Program.cs"), "// entry");

        var result = EntrypointDetector.SuggestSynthCommand(dir);

        result.Should().Contain("dotnet run --project ./arch");
    }

    [Fact]
    public void SuggestSynthCommand_WithCsprojNoProgramCs_SuggestsDotnetRun()
    {
        var dir = CreateSubDir("csproj-only");
        File.WriteAllText(Path.Combine(dir, "MyArch.csproj"), "<Project />");

        var result = EntrypointDetector.SuggestSynthCommand(dir);

        result.Should().Contain("dotnet run --project ./arch");
    }

    [Fact]
    public void SuggestSynthCommand_WithBothTsAndCs_PrioritizesTs()
    {
        var dir = CreateSubDir("both-ts-cs");
        File.WriteAllText(Path.Combine(dir, "main.ts"), "// entry");
        File.WriteAllText(Path.Combine(dir, "Program.cs"), "// entry");

        var result = EntrypointDetector.SuggestSynthCommand(dir);

        // TS takes priority per plan spec
        result.Should().Contain("node main.ts");
    }

    [Fact]
    public void SuggestSynthCommand_NoKnownEntrypoint_ReturnsGenericSample()
    {
        var dir = CreateSubDir("unknown");
        File.WriteAllText(Path.Combine(dir, "readme.txt"), "hello");

        var result = EntrypointDetector.SuggestSynthCommand(dir);

        result.Should().Contain("<your-build-command>");
    }

    private string CreateSubDir(string name)
    {
        var dir = Path.Combine(_tempRoot, name);
        Directory.CreateDirectory(dir);
        return dir;
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempRoot, recursive: true); }
        catch { /* best-effort */ }
    }
}
