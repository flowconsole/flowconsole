using System.ComponentModel;
using System.Text.Json;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Serialization;
using FlowConsole.Cli.Settings;
using FlowConsole.Schema.SnapshotValidation;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class FmtSettings : GlobalSettings
{
    [CommandArgument(0, "<snapshot>")]
    [Description("Path to ModelSnapshot JSON file, or '-' for stdin")]
    public string Snapshot { get; init; } = string.Empty;

    [CommandOption("-o|--output <PATH>")]
    [Description("Output path (default: in-place for file, stdout for stdin '-')")]
    public string? Output { get; init; }

    [CommandOption("--check")]
    [Description("Check mode: exit 1 if not normalized (pre-commit friendly), no modification")]
    public bool Check { get; init; }

    [CommandOption("--indent <VALUE>")]
    [Description("Indentation: 2 (default), 4, or tab")]
    [DefaultValue("2")]
    public string Indent { get; init; } = "2";
}

internal sealed class FmtCommand : Command<FmtSettings>
{
    private readonly IJsonSchemaValidator _schemaValidator;
    private readonly AtomicFileWriter _atomicWriter;
    private readonly CancellationTokenHolder _ctHolder;

    public FmtCommand(
        IJsonSchemaValidator schemaValidator,
        AtomicFileWriter atomicWriter,
        CancellationTokenHolder ctHolder)
    {
        _schemaValidator = schemaValidator;
        _atomicWriter = atomicWriter;
        _ctHolder = ctHolder;
    }

    public override int Execute(CommandContext context, FmtSettings settings)
    {
        return ExecuteAsync(settings).GetAwaiter().GetResult();
    }

    private async Task<int> ExecuteAsync(FmtSettings settings)
    {
        var ct = _ctHolder.Token;
        var isStdin = settings.Snapshot == "-";

        // Parse indent option
        var useTabs = settings.Indent.Equals("tab", StringComparison.OrdinalIgnoreCase);
        var indentSpaces = 2;
        if (!useTabs)
        {
            if (!int.TryParse(settings.Indent, out var parsed) || parsed is not (2 or 4))
            {
                Console.Error.WriteLine("error: --indent must be 2, 4, or tab");
                return 2;
            }
            indentSpaces = parsed;
        }

        // Read input
        string inputJson;
        string? inputPath = null;

        if (isStdin)
        {
            inputJson = await Console.In.ReadToEndAsync(ct).ConfigureAwait(false);
        }
        else
        {
            inputPath = Path.GetFullPath(settings.Snapshot);
            if (!File.Exists(inputPath))
            {
                Console.Error.WriteLine($"File not found: {inputPath}");
                return 2;
            }
            inputJson = await File.ReadAllTextAsync(inputPath, ct).ConfigureAwait(false);
        }

        // Parse and validate schema
        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(inputJson);
        }
        catch (JsonException ex)
        {
            Console.Error.WriteLine($"Invalid JSON: {ex.Message}");
            return 2;
        }

        using (doc)
        {
            var validationResult = _schemaValidator.Validate(doc);
            if (validationResult.IsSuccess)
            {
                var errors = validationResult.Value
                    .Where(d => d.Level == DiagnosticLevel.Error)
                    .ToList();

                if (errors.Count > 0)
                {
                    Console.Error.WriteLine("Schema validation errors:");
                    foreach (var err in errors)
                        Console.Error.WriteLine($"  [{err.Code}] {err.Message} (at {err.Path})");
                    return 2;
                }
            }
        }

        // Normalize
        string normalized;
        try
        {
            normalized = SnapshotSerializer.Normalize(inputJson, indentSpaces, useTabs);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Normalization failed: {ex.Message}");
            return 2;
        }

        // Check mode: compare and report
        if (settings.Check)
        {
            // Normalize line endings and trailing whitespace for comparison.
            // Input files may have CRLF (Windows) while the serializer always emits LF.
            var inputNormalized = inputJson.ReplaceLineEndings("\n").TrimEnd();
            var outputNormalized = normalized.ReplaceLineEndings("\n").TrimEnd();

            if (inputNormalized == outputNormalized)
            {
                if (!Console.IsOutputRedirected)
                    Console.WriteLine("Already normalized.");
                return 0;
            }

            Console.Error.WriteLine(isStdin
                ? "Input is not in canonical format."
                : $"{inputPath} is not in canonical format.");
            return 1;
        }

        // Output
        try
        {
            if (isStdin || settings.Output is not null)
            {
                // stdin → stdout, or explicit -o
                var outputPath = settings.Output;
                if (outputPath is not null)
                {
                    await _atomicWriter.WriteAsync(outputPath, normalized, ct).ConfigureAwait(false);
                    if (!Console.IsOutputRedirected)
                        Console.WriteLine($"Formatted: {outputPath}");
                }
                else
                {
                    // stdin → stdout
                    Console.Write(normalized);
                }
            }
            else
            {
                // In-place
                await _atomicWriter.WriteAsync(inputPath!, normalized, ct).ConfigureAwait(false);
                if (!Console.IsOutputRedirected)
                    Console.WriteLine($"Formatted: {inputPath}");
            }
        }
        catch (OperationCanceledException)
        {
            Console.Error.WriteLine("Format cancelled during output write.");
            return 130;
        }

        return 0;
    }
}
