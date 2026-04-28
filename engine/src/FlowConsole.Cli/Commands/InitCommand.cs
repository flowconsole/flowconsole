using System.ComponentModel;
using System.Reflection;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Settings;
using FlowConsole.Cli.Synth;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class InitSettings : GlobalSettings
{
    [CommandArgument(0, "[directory]")]
    [Description("Target directory (default: current directory)")]
    public string? Directory { get; init; }

    [CommandOption("--with-examples")]
    [Description("Add example ModelSnapshot and sample rules")]
    public bool WithExamples { get; init; }

    [CommandOption("--force")]
    [Description("Overwrite existing .flowconsole.yaml and rules/")]
    public bool Force { get; init; }

    [CommandOption("--update-readme")]
    [Description("Append quickstart hints to README.md")]
    public bool UpdateReadme { get; init; }
}

internal sealed class InitCommand : Command<InitSettings>
{
    private const string FlowConsoleYaml = ".flowconsole.yaml";
    private const string FlowConsoleDir = ".flowconsole";
    private const string RulesDir = "rules";

    private static readonly string DefaultConfig = """
        # FlowConsole configuration
        # See https://flowconsole.tech/docs/cli/config for details
        rules_dir: ./rules
        fail_on: error
        api_url: http://localhost:5555
        synth:
          command: ""              # REQUIRED for fcon synth — set to your build command:
                                   #   "node main.ts"  for TS projects
                                   #   "dotnet run --project ./arch"  for C# projects
          # output: "stdout"       # optional (default=stdout)
          # cwd: "./"              # optional
        """.Replace("        ", "");

    private static readonly string ExampleSnapshot = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.0.0",
          "source": "CodeScan",
          "elements": [
            {
              "id": "api-gateway",
              "name": "API Gateway",
              "kind": "Gateway",
              "source": "CodeScan",
              "technology": "ASP.NET Core"
            },
            {
              "id": "user-service",
              "name": "User Service",
              "kind": "Service",
              "source": "CodeScan",
              "technology": "C#"
            },
            {
              "id": "users-db",
              "name": "Users Database",
              "kind": "Database",
              "source": "CodeScan",
              "technology": "PostgreSQL"
            }
          ],
          "relationships": [
            {
              "id": "rel-gateway-to-user-service",
              "sourceId": "api-gateway",
              "targetId": "user-service",
              "kind": "Calls",
              "technology": "HTTP/REST"
            },
            {
              "id": "rel-user-service-to-db",
              "sourceId": "user-service",
              "targetId": "users-db",
              "kind": "Uses",
              "technology": "Npgsql"
            }
          ]
        }
        """.Replace("        ", "");

    public override int Execute(CommandContext context, InitSettings settings)
    {
        var targetDir = Path.GetFullPath(settings.Directory ?? System.IO.Directory.GetCurrentDirectory());

        if (!System.IO.Directory.Exists(targetDir))
            System.IO.Directory.CreateDirectory(targetDir);

        var configPath = Path.Combine(targetDir, FlowConsoleYaml);
        if (File.Exists(configPath) && !settings.Force)
        {
            CliConsole.Info($"{FlowConsoleYaml} already exists. Use --force to overwrite.");
            return 2;
        }
        var configContent = DefaultConfig;
        if (settings.WithExamples)
        {
            configContent = BuildConfigWithSynthCommand(targetDir);
        }
        File.WriteAllText(configPath, configContent);

        var flowConsoleDir = Path.Combine(targetDir, FlowConsoleDir);
        EnsureDirectory(Path.Combine(flowConsoleDir, "snapshots"));
        EnsureDirectory(Path.Combine(flowConsoleDir, "findings"));
        EnsureDirectory(Path.Combine(flowConsoleDir, "logs"));

        // Self-protection .gitignore inside .flowconsole/
        File.WriteAllText(Path.Combine(flowConsoleDir, ".gitignore"), "*\n");

        AppendToGitignore(targetDir);

        var rulesDir = Path.Combine(targetDir, RulesDir);
        ExportBuiltInRules(rulesDir, settings.Force);

        if (settings.WithExamples)
        {
            var examplesDir = Path.Combine(flowConsoleDir, "snapshots");
            File.WriteAllText(Path.Combine(examplesDir, "example.json"), ExampleSnapshot);
        }

        if (settings.UpdateReadme)
        {
            AppendReadmeHints(targetDir);
        }

        CliConsole.Success($"Initialized FlowConsole project in {targetDir}");
        Console.WriteLine($"  {FlowConsoleYaml} - configuration");
        Console.WriteLine($"  {RulesDir}/ - validation rules ({CountFiles(rulesDir, "*.yaml")} rules)");
        Console.WriteLine($"  {FlowConsoleDir}/ - workspace (gitignored)");

        if (settings.WithExamples)
            Console.WriteLine($"  {FlowConsoleDir}/snapshots/example.json - example snapshot");

        Console.WriteLine();
        Console.WriteLine("Next steps:");
        Console.WriteLine("  fcon scan ./src          # scan your source code");
        Console.WriteLine("  fcon validate            # run validation rules");
        Console.WriteLine("  fcon doctor              # check environment health");

        return 0;
    }

    private static string BuildConfigWithSynthCommand(string targetDir)
    {
        var suggestion = EntrypointDetector.SuggestSynthCommand(targetDir);
        // suggestion format: synth.command: "node main.ts" or synth.command: "<your-build-command>"
        var command = ExtractCommandValue(suggestion);

        if (command.StartsWith('<'))
        {
            // No detected entrypoint — use generic placeholder with comment
            return """
                # FlowConsole configuration
                # See https://flowconsole.tech/docs/cli/config for details
                rules_dir: ./rules
                fail_on: error
                api_url: http://localhost:5555
                synth:
                  command: ""              # REQUIRED for fcon synth — set to your build command:
                                           #   "node main.ts"  for TS projects
                                           #   "dotnet run --project ./arch"  for C# projects
                  # output: "stdout"       # optional (default=stdout)
                  # cwd: "./"              # optional
                """.Replace("                ", "");
        }

        return $"""
            # FlowConsole configuration
            # See https://flowconsole.tech/docs/cli/config for details
            rules_dir: ./rules
            fail_on: error
            api_url: http://localhost:5555
            synth:
              command: "{command}"  # auto-detected entrypoint
              output: "stdout"
              cwd: "./"
            """.Replace("            ", "");
    }

    private static string ExtractCommandValue(string suggestion)
    {
        // Parse: synth.command: "node main.ts" → node main.ts
        var colonIndex = suggestion.IndexOf(':');
        if (colonIndex < 0) return suggestion;
        var value = suggestion[(colonIndex + 1)..].Trim().Trim('"');
        return value;
    }

    private static void EnsureDirectory(string path)
    {
        if (!System.IO.Directory.Exists(path))
            System.IO.Directory.CreateDirectory(path);
    }

    private static void AppendToGitignore(string targetDir)
    {
        var gitignorePath = Path.Combine(targetDir, ".gitignore");
        const string entry = ".flowconsole/";

        if (File.Exists(gitignorePath))
        {
            var content = File.ReadAllText(gitignorePath);
            if (content.Contains(entry, StringComparison.Ordinal))
                return;

            if (content.Length > 0 && !content.EndsWith('\n'))
                File.AppendAllText(gitignorePath, "\n");

            File.AppendAllText(gitignorePath, $"{entry}\n");
        }
        else
        {
            File.WriteAllText(gitignorePath, $"{entry}\n");
        }
    }

    internal static void ExportBuiltInRules(string rulesDir, bool force)
    {
        EnsureDirectory(rulesDir);

        var assembly = typeof(FlowConsole.Rules.Engine.Default.BuiltInRuleLoader).Assembly;
        var resourceNames = assembly.GetManifestResourceNames()
            .Where(n => n.EndsWith(".rule.yaml", StringComparison.OrdinalIgnoreCase))
            .OrderBy(n => n)
            .ToList();

        foreach (var resourceName in resourceNames)
        {
            // Extract filename: last segment after the last dot-separated namespace prefix
            // e.g. "FlowConsole.Rules.Engine.Default.BuiltInRules.no-orphan-elements.rule.yaml"
            // → "no-orphan-elements.rule.yaml"
            var fileName = SharedHelpers.ExtractRuleFileName(resourceName);
            var targetPath = Path.Combine(rulesDir, fileName);

            if (File.Exists(targetPath) && !force)
                continue;

            using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream == null) continue;

            using var reader = new StreamReader(stream);
            File.WriteAllText(targetPath, reader.ReadToEnd());
        }
    }


    private static void AppendReadmeHints(string targetDir)
    {
        var readmePath = FindReadme(targetDir);
        if (readmePath == null)
            return;

        const string marker = "<!-- flowconsole -->";
        var content = File.ReadAllText(readmePath);
        if (content.Contains(marker, StringComparison.Ordinal))
            return;

        var hints = $"""

            {marker}
            ## Architecture Validation

            ```bash
            # Scan source code
            fcon scan ./src

            # Validate against rules
            fcon validate

            # Check environment
            fcon doctor
            ```
            """.Replace("            ", "");

        File.AppendAllText(readmePath, hints);
    }

    private static string? FindReadme(string dir)
    {
        return System.IO.Directory.GetFiles(dir, "README*")
            .FirstOrDefault(f => Path.GetFileName(f).StartsWith("README", StringComparison.OrdinalIgnoreCase));
    }

    private static int CountFiles(string dir, string pattern)
    {
        return System.IO.Directory.Exists(dir) ? System.IO.Directory.GetFiles(dir, pattern).Length : 0;
    }
}
