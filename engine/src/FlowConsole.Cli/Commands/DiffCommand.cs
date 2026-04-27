using System.ComponentModel;
using System.Text.Json;
using FlowConsole.Cli.Diff;
using FlowConsole.Cli.Formatters;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Settings;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class DiffSettings : GlobalSettings
{
    [CommandArgument(0, "<before>")]
    [Description("Path to the 'before' ModelSnapshot JSON file")]
    public string BeforePath { get; init; } = string.Empty;

    [CommandArgument(1, "<after>")]
    [Description("Path to the 'after' ModelSnapshot JSON file")]
    public string AfterPath { get; init; } = string.Empty;

    [CommandOption("--format <FORMAT>")]
    [Description("Output format: human|json|markdown (default: human)")]
    public string Format { get; init; } = "human";

    [CommandOption("-o|--output <PATH>")]
    [Description("Write output to file instead of stdout")]
    public string? OutputPath { get; init; }

    [CommandOption("--only <CATEGORY>")]
    [Description("Filter output: added|removed|changed")]
    public string? Only { get; init; }
}

internal sealed class DiffCommand : Command<DiffSettings>
{
    private static readonly string[] ValidFormats = ["human", "json", "markdown"];
    private static readonly string[] ValidOnlyValues = ["added", "removed", "changed"];

    public override int Execute(CommandContext context, DiffSettings settings)
    {
        // Validate format
        if (!ValidFormats.Contains(settings.Format, StringComparer.OrdinalIgnoreCase))
        {
            CliConsole.Error($"invalid format '{settings.Format}'. Must be one of: human, json, markdown");
            return 2;
        }

        // Validate --only filter
        if (settings.Only is not null && !ValidOnlyValues.Contains(settings.Only, StringComparer.OrdinalIgnoreCase))
        {
            CliConsole.Error($"invalid --only value '{settings.Only}'. Must be one of: added, removed, changed");
            return 2;
        }

        // Read before file
        if (!File.Exists(settings.BeforePath))
        {
            CliConsole.Error($"'before' file not found: {settings.BeforePath}");
            return 2;
        }
        if (!File.Exists(settings.AfterPath))
        {
            CliConsole.Error($"'after' file not found: {settings.AfterPath}");
            return 2;
        }

        string beforeText, afterText;
        try
        {
            beforeText = File.ReadAllText(settings.BeforePath);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            CliConsole.Error($"cannot read 'before' file: {ex.Message}");
            return 2;
        }

        try
        {
            afterText = File.ReadAllText(settings.AfterPath);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            CliConsole.Error($"cannot read 'after' file: {ex.Message}");
            return 2;
        }

        JsonDocument beforeDoc;
        try
        {
            beforeDoc = JsonDocument.Parse(beforeText);
        }
        catch (JsonException ex)
        {
            CliConsole.Error($"invalid JSON in 'before' file: {ex.Message}");
            return 2;
        }

        DiffResult diff;
        using (beforeDoc)
        {
            JsonDocument afterDoc;
            try
            {
                afterDoc = JsonDocument.Parse(afterText);
            }
            catch (JsonException ex)
            {
                CliConsole.Error($"invalid JSON in 'after' file: {ex.Message}");
                return 2;
            }

            using (afterDoc)
            {
                diff = SnapshotDiffer.Compare(beforeDoc, afterDoc);
            }
        }

        if (diff.IsEmpty)
        {
            CliConsole.Info("No differences found.");
            return 0;
        }

        IDiffFormatter formatter = settings.Format.ToLowerInvariant() switch
        {
            "json" => new JsonDiffFormatter(),
            "markdown" => new MarkdownDiffFormatter(),
            _ => new HumanDiffFormatter()
        };

        var output = formatter.Format(diff, settings.Only?.ToLowerInvariant());

        if (settings.OutputPath is not null)
        {
            try
            {
                var dir = Path.GetDirectoryName(settings.OutputPath);
                if (dir is not null && !Directory.Exists(dir))
                    Directory.CreateDirectory(dir);
                File.WriteAllText(settings.OutputPath, output);
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                CliConsole.Error($"cannot write output file: {ex.Message}");
                return 2;
            }
            CliConsole.Info($"Diff written to {settings.OutputPath}");
        }
        else
        {
            Console.Write(output);
        }

        return 0;
    }
}
