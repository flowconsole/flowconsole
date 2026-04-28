using System.Text.Json;
using FlowConsole.Cli.Serialization;
using FlowConsole.Core.Entities;
using FlowConsole.Schema.SnapshotValidation;

namespace FlowConsole.Cli.Hosting;

public sealed class SnapshotStartupValidator
{
    private readonly IJsonSchemaValidator _jsonSchemaValidator;

    public SnapshotStartupValidator(IJsonSchemaValidator jsonSchemaValidator)
    {
        _jsonSchemaValidator = jsonSchemaValidator;
    }

    public ModelSnapshot ValidateAndLoad(string path, long maxBytes)
    {
        var fileInfo = new FileInfo(path);
        if (!fileInfo.Exists)
            throw new FileNotFoundException($"Snapshot file not found: '{path}'", path);

        if (fileInfo.Length > maxBytes)
            throw new InvalidOperationException(
                $"Snapshot file '{path}' is {fileInfo.Length:N0} bytes, exceeding limit of {maxBytes:N0} bytes");

        JsonDocument document;
        try
        {
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read,
                FileShare.ReadWrite | FileShare.Delete);
            document = JsonDocument.Parse(stream);
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException(
                $"Snapshot file '{path}' contains invalid JSON at line {ex.LineNumber}, position {ex.BytePositionInLine}: {ex.Message}",
                ex);
        }

        using (document)
        {
            var validationResult = _jsonSchemaValidator.Validate(document);
            if (validationResult.IsFailed)
                throw new InvalidOperationException(
                    $"Schema validation failed for '{path}': {string.Join("; ", validationResult.Errors.Select(e => e.Message))}");

            var diagnostics = validationResult.Value;
            var errors = diagnostics.Where(d => d.Level == DiagnosticLevel.Error).ToList();
            if (errors.Count > 0)
            {
                var messages = errors.Select(d => $"  [{d.Code}] {d.Path}: {d.Message}");
                throw new InvalidOperationException(
                    $"Snapshot validation errors in '{path}':\n{string.Join("\n", messages)}");
            }

            foreach (var warning in diagnostics.Where(d => d.Level == DiagnosticLevel.Warning))
                Console.Error.WriteLine($"warning: [{warning.Code}] {warning.Path}: {warning.Message}");

            return SnapshotDeserializer.Deserialize(document);
        }
    }
}
