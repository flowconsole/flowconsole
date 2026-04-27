using System.Text;
using FlowConsole.Cli.Diff;

namespace FlowConsole.Cli.Formatters;

/// <summary>
/// Formats diff results as colored human-readable tree output.
/// Uses ANSI escape codes for color (green +, red -, yellow ~).
/// Respects NO_COLOR env and non-TTY stdout via Spectre.Console conventions.
/// </summary>
internal sealed class HumanDiffFormatter : IDiffFormatter
{
    public string Format(DiffResult diff, string? onlyFilter)
    {
        var sb = new StringBuilder();
        var useColor = ShouldUseColor();

        var showAdded = onlyFilter is null or "added";
        var showRemoved = onlyFilter is null or "removed";
        var showChanged = onlyFilter is null or "changed";

        if (showAdded)
        {
            foreach (var elem in diff.AddedElements)
                sb.AppendLine(Colorize($"+ {elem.Kind}: {elem.Name}", "\u001b[32m", useColor));
            foreach (var rel in diff.AddedRelationships)
                sb.AppendLine(Colorize($"+ Relationship: {rel.SourceId} -> {rel.TargetId} ({rel.Kind})", "\u001b[32m", useColor));
        }

        if (showRemoved)
        {
            foreach (var elem in diff.RemovedElements)
                sb.AppendLine(Colorize($"- {elem.Kind}: {elem.Name}", "\u001b[31m", useColor));
            foreach (var rel in diff.RemovedRelationships)
                sb.AppendLine(Colorize($"- Relationship: {rel.SourceId} -> {rel.TargetId} ({rel.Kind})", "\u001b[31m", useColor));
        }

        if (showChanged)
        {
            foreach (var elem in diff.ChangedElements)
            {
                sb.AppendLine(Colorize($"~ {elem.After.Kind}: {elem.After.Name}", "\u001b[33m", useColor));
                foreach (var change in elem.FieldChanges)
                    sb.AppendLine($"    {change.Field}: {change.Before ?? "(empty)"} -> {change.After ?? "(empty)"}");
            }
            foreach (var rel in diff.ChangedRelationships)
            {
                sb.AppendLine(Colorize($"~ Relationship: {rel.After.SourceId} -> {rel.After.TargetId} ({rel.After.Kind})", "\u001b[33m", useColor));
                foreach (var change in rel.FieldChanges)
                    sb.AppendLine($"    {change.Field}: {change.Before ?? "(empty)"} -> {change.After ?? "(empty)"}");
            }
        }

        // Summary line (respects --only filter)
        var addedCount = showAdded ? diff.AddedElements.Count + diff.AddedRelationships.Count : 0;
        var removedCount = showRemoved ? diff.RemovedElements.Count + diff.RemovedRelationships.Count : 0;
        var changedCount = showChanged ? diff.ChangedElements.Count + diff.ChangedRelationships.Count : 0;
        var total = addedCount + removedCount + changedCount;
        if (total > 0)
        {
            sb.AppendLine();
            sb.AppendLine($"Summary: {addedCount} added, {removedCount} removed, {changedCount} changed");
        }

        return sb.ToString();
    }

    private static bool ShouldUseColor()
    {
        // Respect NO_COLOR convention (https://no-color.org/)
        if (Environment.GetEnvironmentVariable("NO_COLOR") is not null)
            return false;

        // Non-interactive (piped) stdout — skip colors
        try
        {
            return !Console.IsOutputRedirected;
        }
        catch
        {
            return false;
        }
    }

    private static string Colorize(string text, string ansiCode, bool useColor) =>
        useColor ? $"{ansiCode}{text}\u001b[0m" : text;
}
