using System.Text.Json;
using System.Text.Json.Serialization;
using FlowConsole.Cli.Commands;
using FlowConsole.Rules.Core.Execution;

namespace FlowConsole.Cli.Formatters;

/// <summary>
/// SARIF 2.1.0 output formatter for findings.
/// Produces valid SARIF JSON per the OASIS spec.
/// </summary>
internal sealed partial class SarifFormatter : IFindingsFormatter
{
    private const string SarifVersion = "2.1.0";
    private const string SchemaUri = "https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json";

    public string Format(RuleExecutionResult result, bool includeTrace)
    {
        var rules = result.Findings
            .Select(f => f.RuleId)
            .Distinct()
            .Select((id, index) => new { id, index })
            .ToDictionary(x => x.id, x => x.index);

        var ruleDescriptors = result.Findings
            .GroupBy(f => f.RuleId)
            .Select(g => g.First())
            .Select(f => new SarifReportingDescriptor
            {
                Id = f.RuleId,
                Name = f.RuleName,
                ShortDescription = new SarifMessage { Text = f.RuleName }
            })
            .ToList();

        var results = result.Findings.Select(f => new SarifResult
        {
            RuleId = f.RuleId,
            RuleIndex = rules.TryGetValue(f.RuleId, out var idx) ? idx : 0,
            Level = MapSeverity(f.Severity),
            Message = new SarifMessage { Text = f.Message },
            Locations = f.ElementIds.Count > 0
                ? f.ElementIds.Select(id => new SarifLocation
                {
                    LogicalLocations = [new SarifLogicalLocation { Name = id }]
                }).ToList()
                : []
        }).ToList();

        var sarif = new SarifLog
        {
            Schema = SchemaUri,
            Version = SarifVersion,
            Runs =
            [
                new SarifRun
                {
                    Tool = new SarifTool
                    {
                        Driver = new SarifToolComponent
                        {
                            Name = "fcon validate",
                            Version = VersionCommand.GetVersion(),
                            Rules = ruleDescriptors
                        }
                    },
                    Results = results
                }
            ]
        };

        return JsonSerializer.Serialize(sarif, SarifContext.Default.SarifLog);
    }

    private static string MapSeverity(string severity) => severity switch
    {
        "critical" => "error",
        "error" => "error",
        "warning" => "warning",
        "info" => "note",
        _ => "none"
    };

    private sealed class SarifLog
    {
        [JsonPropertyName("$schema")]
        public string Schema { get; init; } = "";

        [JsonPropertyName("version")]
        public string Version { get; init; } = "";

        [JsonPropertyName("runs")]
        public List<SarifRun> Runs { get; init; } = [];
    }

    private sealed class SarifRun
    {
        [JsonPropertyName("tool")]
        public SarifTool Tool { get; init; } = new();

        [JsonPropertyName("results")]
        public List<SarifResult> Results { get; init; } = [];
    }

    private sealed class SarifTool
    {
        [JsonPropertyName("driver")]
        public SarifToolComponent Driver { get; init; } = new();
    }

    private sealed class SarifToolComponent
    {
        [JsonPropertyName("name")]
        public string Name { get; init; } = "";

        [JsonPropertyName("version")]
        public string Version { get; init; } = "";

        [JsonPropertyName("rules")]
        public List<SarifReportingDescriptor> Rules { get; init; } = [];
    }

    private sealed class SarifReportingDescriptor
    {
        [JsonPropertyName("id")]
        public string Id { get; init; } = "";

        [JsonPropertyName("name")]
        public string Name { get; init; } = "";

        [JsonPropertyName("shortDescription")]
        public SarifMessage ShortDescription { get; init; } = new();
    }

    private sealed class SarifResult
    {
        [JsonPropertyName("ruleId")]
        public string RuleId { get; init; } = "";

        [JsonPropertyName("ruleIndex")]
        public int RuleIndex { get; init; }

        [JsonPropertyName("level")]
        public string Level { get; init; } = "";

        [JsonPropertyName("message")]
        public SarifMessage Message { get; init; } = new();

        [JsonPropertyName("locations")]
        public List<SarifLocation> Locations { get; init; } = [];
    }

    private sealed class SarifMessage
    {
        [JsonPropertyName("text")]
        public string Text { get; init; } = "";
    }

    private sealed class SarifLocation
    {
        [JsonPropertyName("logicalLocations")]
        public List<SarifLogicalLocation> LogicalLocations { get; init; } = [];
    }

    private sealed class SarifLogicalLocation
    {
        [JsonPropertyName("name")]
        public string Name { get; init; } = "";
    }

    [JsonSerializable(typeof(SarifLog))]
    [JsonSourceGenerationOptions(WriteIndented = true)]
    private sealed partial class SarifContext : JsonSerializerContext;
}
