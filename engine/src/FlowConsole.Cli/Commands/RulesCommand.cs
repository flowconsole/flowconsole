using System.ComponentModel;
using System.Reflection;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Settings;
using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Engine.Default;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class RulesListSettings : GlobalSettings
{
    [CommandOption("--built-in")]
    [Description("Show only built-in rules")]
    public bool BuiltIn { get; init; }
}

internal sealed class RulesListCommand : Command<RulesListSettings>
{
    private readonly BuiltInRuleLoader _builtInRuleLoader;

    public RulesListCommand(BuiltInRuleLoader builtInRuleLoader)
    {
        _builtInRuleLoader = builtInRuleLoader;
    }

    public override int Execute(CommandContext context, RulesListSettings settings)
    {
        var builtIn = _builtInRuleLoader.GetBuiltInRules();
        if (builtIn is null || builtIn.Rules.Count == 0)
        {
            CliConsole.Info("No built-in rules found.");
            return 0;
        }

        Console.WriteLine($"{"ID",-30} {"SEVERITY",-10} {"KIND",-10} {"TARGET",-8} {"NAME"}");
        Console.WriteLine(new string('-', 80));

        foreach (var rule in builtIn.Rules.OrderBy(r => r.Id))
        {
            Console.WriteLine($"{rule.Id,-30} {rule.Severity.ToString().ToLowerInvariant(),-10} {rule.Kind.ToString().ToLowerInvariant(),-10} {rule.Target.ToString().ToLowerInvariant(),-8} {rule.Name}");
        }

        Console.WriteLine();
        Console.WriteLine($"{builtIn.Rules.Count} rules total");

        return 0;
    }
}

internal sealed class RulesExportSettings : GlobalSettings
{
    [CommandArgument(0, "<output-dir>")]
    [Description("Directory to export built-in rule files to")]
    public string OutputDir { get; init; } = string.Empty;
}

internal sealed class RulesExportCommand : Command<RulesExportSettings>
{
    public override int Execute(CommandContext context, RulesExportSettings settings)
    {
        var outputDir = Path.GetFullPath(settings.OutputDir);
        Directory.CreateDirectory(outputDir);

        var assembly = typeof(BuiltInRuleLoader).Assembly;
        var resourceNames = assembly.GetManifestResourceNames()
            .Where(n => n.EndsWith(".rule.yaml", StringComparison.OrdinalIgnoreCase))
            .OrderBy(n => n)
            .ToList();

        if (resourceNames.Count == 0)
        {
            CliConsole.Info("No built-in rule files found.");
            return 0;
        }

        var exported = 0;
        foreach (var resourceName in resourceNames)
        {
            using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream == null) continue;

            using var reader = new StreamReader(stream);
            var content = reader.ReadToEnd();

            var fileName = SharedHelpers.ExtractRuleFileName(resourceName);
            var outputPath = Path.Combine(outputDir, fileName);

            File.WriteAllText(outputPath, content);
            Console.WriteLine($"  {fileName}");
            exported++;
        }

        Console.WriteLine($"\nExported {exported} rule files to {outputDir}");
        return 0;
    }

}
