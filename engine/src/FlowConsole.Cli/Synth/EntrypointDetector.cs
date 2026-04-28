namespace FlowConsole.Cli.Synth;

internal static class EntrypointDetector
{
    public static string SuggestSynthCommand(string cwd)
    {
        if (File.Exists(Path.Combine(cwd, "main.ts")) || File.Exists(Path.Combine(cwd, "main.tsx")))
            return "synth.command: \"node main.ts\"";

        if (File.Exists(Path.Combine(cwd, "Program.cs")) || Directory.GetFiles(cwd, "*.csproj").Length > 0)
            return "synth.command: \"dotnet run --project ./arch\"";

        return "synth.command: \"<your-build-command>\"";
    }
}
