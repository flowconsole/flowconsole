using System.Text.Json;

namespace FlowConsole.Cli.Synth;

/// <summary>
/// Represents a diff between local and remote flow snapshots.
/// </summary>
internal sealed record FlowDiff(
    IReadOnlyList<FlowSummary> Added,
    IReadOnlyList<FlowSummary> Removed,
    IReadOnlyList<(FlowSummary Before, FlowSummary After)> Changed);

/// <summary>
/// Lightweight flow representation for diff purposes.
/// </summary>
internal sealed record FlowSummary(string Id, string Name, IReadOnlyList<StepSummary> Steps);

/// <summary>
/// Lightweight flow step representation for diff purposes.
/// </summary>
internal sealed record StepSummary(string SourceElementId, string? RelationshipId, string? Label);

/// <summary>
/// Computes and renders flow-level diffs between local and remote model snapshots.
/// </summary>
internal static class FlowDiffRenderer
{
    /// <summary>
    /// Computes a flow diff between local and remote snapshots.
    /// </summary>
    public static FlowDiff ComputeDiff(JsonDocument local, JsonDocument remote)
    {
        var localFlows = ExtractFlows(local);
        var remoteFlows = ExtractFlows(remote);

        var localById = localFlows.ToDictionary(f => f.Id, StringComparer.Ordinal);
        var remoteById = remoteFlows.ToDictionary(f => f.Id, StringComparer.Ordinal);

        var added = new List<FlowSummary>();
        var removed = new List<FlowSummary>();
        var changed = new List<(FlowSummary Before, FlowSummary After)>();

        // Flows in local but not in remote = added
        foreach (var flow in localFlows)
        {
            if (!remoteById.ContainsKey(flow.Id))
            {
                added.Add(flow);
            }
            else
            {
                var remoteFlow = remoteById[flow.Id];
                if (!FlowsEqual(flow, remoteFlow))
                    changed.Add((remoteFlow, flow));
            }
        }

        // Flows in remote but not in local = removed
        foreach (var flow in remoteFlows)
        {
            if (!localById.ContainsKey(flow.Id))
                removed.Add(flow);
        }

        return new FlowDiff(added, removed, changed);
    }

    /// <summary>
    /// Returns true if the diff has no changes.
    /// </summary>
    public static bool IsEmpty(FlowDiff diff) =>
        diff.Added.Count == 0 && diff.Removed.Count == 0 && diff.Changed.Count == 0;

    /// <summary>
    /// Renders a flow diff to the given TextWriter.
    /// </summary>
    public static void Render(FlowDiff diff, TextWriter writer, bool useColor = false)
    {
        if (IsEmpty(diff))
        {
            writer.WriteLine("Flows: no changes.");
            return;
        }

        writer.WriteLine("Flow diff:");
        writer.WriteLine();

        foreach (var flow in diff.Added)
        {
            var prefix = useColor ? "\x1b[32m" : "";
            var reset = useColor ? "\x1b[0m" : "";
            writer.WriteLine($"{prefix}+ flow \"{flow.Name}\" ({flow.Id}) [{flow.Steps.Count} steps]{reset}");
            foreach (var step in flow.Steps)
            {
                writer.WriteLine($"  {prefix}+ {FormatStep(step)}{reset}");
            }
        }

        foreach (var flow in diff.Removed)
        {
            var prefix = useColor ? "\x1b[31m" : "";
            var reset = useColor ? "\x1b[0m" : "";
            writer.WriteLine($"{prefix}- flow \"{flow.Name}\" ({flow.Id}) [{flow.Steps.Count} steps]{reset}");
            foreach (var step in flow.Steps)
            {
                writer.WriteLine($"  {prefix}- {FormatStep(step)}{reset}");
            }
        }

        foreach (var (before, after) in diff.Changed)
        {
            var prefix = useColor ? "\x1b[33m" : "";
            var reset = useColor ? "\x1b[0m" : "";
            writer.WriteLine($"{prefix}~ flow \"{after.Name}\" ({after.Id}){reset}");
            RenderStepDiff(before.Steps, after.Steps, writer, useColor);
        }

        writer.WriteLine();
        writer.WriteLine($"Summary: +{diff.Added.Count} added, -{diff.Removed.Count} removed, ~{diff.Changed.Count} changed");
    }

    private static void RenderStepDiff(
        IReadOnlyList<StepSummary> before,
        IReadOnlyList<StepSummary> after,
        TextWriter writer,
        bool useColor)
    {
        var maxLen = Math.Max(before.Count, after.Count);
        for (var i = 0; i < maxLen; i++)
        {
            var hasB = i < before.Count;
            var hasA = i < after.Count;

            if (hasB && hasA)
            {
                var b = before[i];
                var a = after[i];
                if (!StepsEqual(b, a))
                {
                    var redPfx = useColor ? "\x1b[31m" : "";
                    var greenPfx = useColor ? "\x1b[32m" : "";
                    var reset = useColor ? "\x1b[0m" : "";
                    writer.WriteLine($"  {redPfx}- [{i}] {FormatStep(b)}{reset}");
                    writer.WriteLine($"  {greenPfx}+ [{i}] {FormatStep(a)}{reset}");
                }
            }
            else if (hasA)
            {
                var greenPfx = useColor ? "\x1b[32m" : "";
                var reset = useColor ? "\x1b[0m" : "";
                writer.WriteLine($"  {greenPfx}+ [{i}] {FormatStep(after[i])}{reset}");
            }
            else if (hasB)
            {
                var redPfx = useColor ? "\x1b[31m" : "";
                var reset = useColor ? "\x1b[0m" : "";
                writer.WriteLine($"  {redPfx}- [{i}] {FormatStep(before[i])}{reset}");
            }
        }
    }

    private static string FormatStep(StepSummary step)
    {
        var label = step.Label is not null ? $" \"{step.Label}\"" : "";
        if (step.RelationshipId is not null)
            return $"{step.SourceElementId} --[{step.RelationshipId}]-->{label}";
        return $"{step.SourceElementId}{label} (action)";
    }

    private static bool FlowsEqual(FlowSummary a, FlowSummary b)
    {
        if (!string.Equals(a.Name, b.Name, StringComparison.Ordinal))
            return false;
        if (a.Steps.Count != b.Steps.Count)
            return false;
        for (var i = 0; i < a.Steps.Count; i++)
        {
            if (!StepsEqual(a.Steps[i], b.Steps[i]))
                return false;
        }
        return true;
    }

    private static bool StepsEqual(StepSummary a, StepSummary b) =>
        string.Equals(a.SourceElementId, b.SourceElementId, StringComparison.Ordinal) &&
        string.Equals(a.RelationshipId, b.RelationshipId, StringComparison.Ordinal) &&
        string.Equals(a.Label, b.Label, StringComparison.Ordinal);

    private static IReadOnlyList<FlowSummary> ExtractFlows(JsonDocument doc)
    {
        var flows = new List<FlowSummary>();

        if (!doc.RootElement.TryGetProperty("flows", out var flowsElement) ||
            flowsElement.ValueKind != JsonValueKind.Array)
            return flows;

        foreach (var flow in flowsElement.EnumerateArray())
        {
            var id = flow.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? "" : "";
            var name = flow.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "" : "";
            var steps = new List<StepSummary>();

            if (flow.TryGetProperty("steps", out var stepsElement) && stepsElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var step in stepsElement.EnumerateArray())
                {
                    var sourceElementId = step.TryGetProperty("sourceElementId", out var srcProp)
                        ? srcProp.GetString() ?? "" : "";
                    var relationshipId = step.TryGetProperty("relationshipId", out var relProp)
                        ? relProp.GetString() : null;
                    var label = step.TryGetProperty("label", out var lblProp)
                        ? lblProp.GetString() : null;
                    steps.Add(new StepSummary(sourceElementId, relationshipId, label));
                }
            }

            flows.Add(new FlowSummary(id, name, steps));
        }

        return flows;
    }
}
