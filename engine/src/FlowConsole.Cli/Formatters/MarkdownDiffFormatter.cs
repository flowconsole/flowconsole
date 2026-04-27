using System.Text;
using FlowConsole.Cli.Diff;

namespace FlowConsole.Cli.Formatters;

/// <summary>
/// Formats diff results as PR-comment-ready Markdown.
/// </summary>
internal sealed class MarkdownDiffFormatter : IDiffFormatter
{
    public string Format(DiffResult diff, string? onlyFilter)
    {
        var sb = new StringBuilder();

        var showAdded = onlyFilter is null or "added";
        var showRemoved = onlyFilter is null or "removed";
        var showChanged = onlyFilter is null or "changed";

        sb.AppendLine("## Architecture Diff");
        sb.AppendLine();

        if (showAdded && (diff.AddedElements.Count > 0 || diff.AddedRelationships.Count > 0))
        {
            sb.AppendLine("### Added");
            sb.AppendLine();
            if (diff.AddedElements.Count > 0)
            {
                sb.AppendLine("| Kind | Name | Technology |");
                sb.AppendLine("|------|------|------------|");
                foreach (var elem in diff.AddedElements)
                    sb.AppendLine($"| {Esc(elem.Kind)} | {Esc(elem.Name)} | {Esc(elem.Technology)} |");
                sb.AppendLine();
            }
            if (diff.AddedRelationships.Count > 0)
            {
                sb.AppendLine("| Source | Target | Kind |");
                sb.AppendLine("|--------|--------|------|");
                foreach (var rel in diff.AddedRelationships)
                    sb.AppendLine($"| {Esc(rel.SourceId)} | {Esc(rel.TargetId)} | {Esc(rel.Kind)} |");
                sb.AppendLine();
            }
        }

        if (showRemoved && (diff.RemovedElements.Count > 0 || diff.RemovedRelationships.Count > 0))
        {
            sb.AppendLine("### Removed");
            sb.AppendLine();
            if (diff.RemovedElements.Count > 0)
            {
                sb.AppendLine("| Kind | Name | Technology |");
                sb.AppendLine("|------|------|------------|");
                foreach (var elem in diff.RemovedElements)
                    sb.AppendLine($"| {Esc(elem.Kind)} | {Esc(elem.Name)} | {Esc(elem.Technology)} |");
                sb.AppendLine();
            }
            if (diff.RemovedRelationships.Count > 0)
            {
                sb.AppendLine("| Source | Target | Kind |");
                sb.AppendLine("|--------|--------|------|");
                foreach (var rel in diff.RemovedRelationships)
                    sb.AppendLine($"| {Esc(rel.SourceId)} | {Esc(rel.TargetId)} | {Esc(rel.Kind)} |");
                sb.AppendLine();
            }
        }

        if (showChanged && (diff.ChangedElements.Count > 0 || diff.ChangedRelationships.Count > 0))
        {
            sb.AppendLine("### Changed");
            sb.AppendLine();
            if (diff.ChangedElements.Count > 0)
            {
                sb.AppendLine("| Kind | Name | Field | Before | After |");
                sb.AppendLine("|------|------|-------|--------|-------|");
                foreach (var elem in diff.ChangedElements)
                    foreach (var change in elem.FieldChanges)
                        sb.AppendLine($"| {Esc(elem.After.Kind)} | {Esc(elem.After.Name)} | {Esc(change.Field)} | {Esc(change.Before)} | {Esc(change.After)} |");
                sb.AppendLine();
            }
            if (diff.ChangedRelationships.Count > 0)
            {
                sb.AppendLine("| Source -> Target | Kind | Field | Before | After |");
                sb.AppendLine("|------------------|------|-------|--------|-------|");
                foreach (var rel in diff.ChangedRelationships)
                    foreach (var change in rel.FieldChanges)
                        sb.AppendLine($"| {Esc(rel.After.SourceId)} -> {Esc(rel.After.TargetId)} | {Esc(rel.After.Kind)} | {Esc(change.Field)} | {Esc(change.Before)} | {Esc(change.After)} |");
                sb.AppendLine();
            }
        }

        // Summary
        var added = diff.AddedElements.Count + diff.AddedRelationships.Count;
        var removed = diff.RemovedElements.Count + diff.RemovedRelationships.Count;
        var changed = diff.ChangedElements.Count + diff.ChangedRelationships.Count;
        sb.AppendLine($"**Summary:** {added} added, {removed} removed, {changed} changed");

        return sb.ToString();
    }

    private static string Esc(string? value) =>
        (value ?? "")
            .Replace("\\", "\\\\")
            .Replace("|", "\\|")
            .Replace("`", "\\`")
            .Replace("*", "\\*")
            .Replace("_", "\\_")
            .Replace("[", "\\[")
            .Replace("]", "\\]")
            .Replace("<", "&lt;")
            .Replace("\r", "")
            .Replace("\n", " ");
}
