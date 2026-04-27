using System.Text.Json;
using System.Text.Json.Serialization;
using FlowConsole.Rules.Core.Execution;

namespace FlowConsole.Cli.Formatters;

/// <summary>
/// JSON output formatter. Serializes findings as a JSON array with metadata.
/// </summary>
internal sealed partial class JsonFormatter : IFindingsFormatter
{
    public string Format(RuleExecutionResult result, bool includeTrace)
    {
        var output = new JsonOutput
        {
            ExecutedAt = result.ExecutedAt,
            RuleCount = result.RuleCount,
            PassedCount = result.PassedCount,
            FailedCount = result.FailedCount,
            Findings = result.Findings.Select(f => new JsonFinding
            {
                RuleId = f.RuleId,
                RuleName = f.RuleName,
                Severity = f.Severity,
                Blocking = f.Blocking,
                Message = f.Message,
                ElementIds = f.ElementIds.ToList()
            }).ToList(),
            Errors = result.Errors.Select(e => new JsonError
            {
                RuleId = e.RuleId,
                Code = e.Code,
                Message = e.Message
            }).ToList()
        };

        return JsonSerializer.Serialize(output, JsonOutputContext.Default.JsonOutput);
    }

    private sealed class JsonOutput
    {
        [JsonPropertyName("executedAt")]
        public DateTimeOffset ExecutedAt { get; init; }

        [JsonPropertyName("ruleCount")]
        public int RuleCount { get; init; }

        [JsonPropertyName("passedCount")]
        public int PassedCount { get; init; }

        [JsonPropertyName("failedCount")]
        public int FailedCount { get; init; }

        [JsonPropertyName("findings")]
        public List<JsonFinding> Findings { get; init; } = [];

        [JsonPropertyName("errors")]
        public List<JsonError> Errors { get; init; } = [];
    }

    private sealed class JsonFinding
    {
        [JsonPropertyName("ruleId")]
        public string RuleId { get; init; } = "";

        [JsonPropertyName("ruleName")]
        public string RuleName { get; init; } = "";

        [JsonPropertyName("severity")]
        public string Severity { get; init; } = "";

        [JsonPropertyName("blocking")]
        public bool Blocking { get; init; }

        [JsonPropertyName("message")]
        public string Message { get; init; } = "";

        [JsonPropertyName("elementIds")]
        public List<string> ElementIds { get; init; } = [];
    }

    private sealed class JsonError
    {
        [JsonPropertyName("ruleId")]
        public string RuleId { get; init; } = "";

        [JsonPropertyName("code")]
        public string Code { get; init; } = "";

        [JsonPropertyName("message")]
        public string Message { get; init; } = "";
    }

    [JsonSerializable(typeof(JsonOutput))]
    [JsonSourceGenerationOptions(WriteIndented = true)]
    private sealed partial class JsonOutputContext : JsonSerializerContext;
}
