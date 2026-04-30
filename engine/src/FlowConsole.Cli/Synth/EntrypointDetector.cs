namespace FlowConsole.Cli.Synth;

internal static class EntrypointDetector
{
    public static string SuggestBuildCommand(string cwd)
    {
        if (File.Exists(Path.Combine(cwd, "main.ts")) || File.Exists(Path.Combine(cwd, "main.tsx")))
            return "build.command: \"node main.ts\"";

        if (File.Exists(Path.Combine(cwd, "Program.cs")) || Directory.GetFiles(cwd, "*.csproj").Length > 0)
            return "build.command: \"dotnet run --project ./arch\"";

        return "build.command: \"<your-build-command>\"";
    }
}
