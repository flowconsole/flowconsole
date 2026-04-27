using FlowConsole.Rules.Core.Diagnostics;
using YamlDotNet.Core;
using YamlDotNet.RepresentationModel;

namespace FlowConsole.Rules.Core.Ingest;

/// <summary>
/// Phase 1: Parses YAML or JSON content into a YAML node tree.
/// Validates top-level structure (apiVersion, kind).
/// </summary>
internal sealed class RuleFileParser
{
    private const string ExpectedApiVersion = "rules.flowconsole.tech/v1alpha1";
    private const string ExpectedKind = "RuleFile";

    public ParseResult Parse(string content, string filePath)
    {
        var diagnostics = new List<Diagnostic>();

        YamlMappingNode document;
        try
        {
            var yaml = new YamlStream();
            using var reader = new StringReader(content);
            yaml.Load(reader);

            if (yaml.Documents.Count == 0)
            {
                diagnostics.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_PARSE_YAML_SYNTAX_ERROR,
                    Phase = DiagnosticPhase.Parse,
                    Level = DiagnosticLevel.Error,
                    Path = "/",
                    Message = "Document is empty."
                });
                return new ParseResult(null, diagnostics);
            }

            var root = yaml.Documents[0].RootNode;

            if (root is not YamlMappingNode mapping)
            {
                diagnostics.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_PARSE_INVALID_DOCUMENT_TYPE,
                    Phase = DiagnosticPhase.Parse,
                    Level = DiagnosticLevel.Error,
                    Path = "/",
                    SourceRange = ToSourceRange(root),
                    Message = "Root document must be a mapping/object."
                });
                return new ParseResult(null, diagnostics);
            }

            document = mapping;
        }
        catch (YamlException ex)
        {
            diagnostics.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_PARSE_YAML_SYNTAX_ERROR,
                Phase = DiagnosticPhase.Parse,
                Level = DiagnosticLevel.Error,
                Path = "/",
                SourceRange = new SourceRange(
                    new SourcePosition((int)ex.Start.Line, (int)ex.Start.Column, (int)ex.Start.Index)),
                Message = $"YAML syntax error: {ex.Message}"
            });
            return new ParseResult(null, diagnostics);
        }

        // Validate apiVersion
        var apiVersionNode = GetScalar(document, "apiVersion");
        if (apiVersionNode == null)
        {
            diagnostics.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_PARSE_UNSUPPORTED_API_VERSION,
                Phase = DiagnosticPhase.Parse,
                Level = DiagnosticLevel.Error,
                Path = "/apiVersion",
                Message = "Missing apiVersion field."
            });
        }
        else if (apiVersionNode.Value != ExpectedApiVersion)
        {
            diagnostics.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_PARSE_UNSUPPORTED_API_VERSION,
                Phase = DiagnosticPhase.Parse,
                Level = DiagnosticLevel.Error,
                Path = "/apiVersion",
                SourceRange = ToSourceRange(apiVersionNode),
                Message = $"Unsupported apiVersion '{apiVersionNode.Value}'. Expected '{ExpectedApiVersion}'."
            });
        }

        // Validate kind
        var kindNode = GetScalar(document, "kind");
        if (kindNode == null)
        {
            diagnostics.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_PARSE_UNSUPPORTED_KIND,
                Phase = DiagnosticPhase.Parse,
                Level = DiagnosticLevel.Error,
                Path = "/kind",
                Message = "Missing kind field."
            });
        }
        else if (kindNode.Value != ExpectedKind)
        {
            diagnostics.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_PARSE_UNSUPPORTED_KIND,
                Phase = DiagnosticPhase.Parse,
                Level = DiagnosticLevel.Error,
                Path = "/kind",
                SourceRange = ToSourceRange(kindNode),
                Message = $"Unsupported kind '{kindNode.Value}'. Expected '{ExpectedKind}'."
            });
        }

        if (diagnostics.Count > 0)
            return new ParseResult(null, diagnostics);

        return new ParseResult(document, diagnostics);
    }

    internal static YamlScalarNode? GetScalar(YamlMappingNode mapping, string key)
    {
        foreach (var entry in mapping.Children)
        {
            if (entry.Key is YamlScalarNode k && k.Value == key && entry.Value is YamlScalarNode v)
                return v;
        }
        return null;
    }

    internal static YamlNode? GetChild(YamlMappingNode mapping, string key)
    {
        foreach (var entry in mapping.Children)
        {
            if (entry.Key is YamlScalarNode k && k.Value == key)
                return entry.Value;
        }
        return null;
    }

    internal static bool HasKey(YamlMappingNode mapping, string key)
    {
        foreach (var entry in mapping.Children)
        {
            if (entry.Key is YamlScalarNode k && k.Value == key)
                return true;
        }
        return false;
    }

    internal static SourceRange ToSourceRange(YamlNode node)
    {
        return new SourceRange(
            new SourcePosition((int)node.Start.Line, (int)node.Start.Column, (int)node.Start.Index),
            new SourcePosition((int)node.End.Line, (int)node.End.Column, (int)node.End.Index));
    }
}

internal sealed record ParseResult(
    YamlMappingNode? Document,
    IReadOnlyList<Diagnostic> Diagnostics);
