namespace FlowConsole.Cli.Synth;

/// <summary>
/// Suggests a <c>synth.command</c> value based on files present in a directory.
/// Used only on the error path when config is missing (Premise #11 — no silent fallback).
/// </summary>
internal static class EntrypointDetector
{
    /// <summary>
    /// Returns a suggested <c>synth.command</c> config line based on files in <paramref name="cwd"/>.
    /// Pure function: uses only <see cref="File.Exists"/> and <see cref="Directory.GetFiles"/>.
    /// </summary>
    public static string SuggestSynthCommand(string cwd)
    {
        if (File.Exists(Path.Combine(cwd, "main.ts")) || File.Exists(Path.Combine(cwd, "main.tsx")))
            return "synth.command: \"node main.ts\"";

        if (File.Exists(Path.Combine(cwd, "Program.cs")) || Directory.GetFiles(cwd, "*.csproj").Length > 0)
            return "synth.command: \"dotnet run --project ./arch\"";

        return "synth.command: \"<your-build-command>\"";
    }
}
