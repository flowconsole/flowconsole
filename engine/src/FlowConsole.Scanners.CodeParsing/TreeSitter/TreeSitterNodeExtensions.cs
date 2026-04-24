using TreeSitter;

namespace FlowConsole.Scanners.CodeParsing.TreeSitterSupport;

internal static class TreeSitterNodeExtensions
{
    public static IEnumerable<Node> DescendantsAndSelf(this Node node)
    {
        yield return node;

        foreach (var child in node.Children)
        {
            foreach (var descendant in child.DescendantsAndSelf())
                yield return descendant;
        }
    }

    public static IEnumerable<Node> DescendantsOfType(this Node node, params string[] types)
    {
        ArgumentNullException.ThrowIfNull(types);
        if (types.Length == 0)
            yield break;

        var typeSet = new HashSet<string>(types, StringComparer.Ordinal);
        foreach (var descendant in node.DescendantsAndSelf())
        {
            if (typeSet.Contains(descendant.Type))
                yield return descendant;
        }
    }

    public static Node? TryGetChildForField(this Node node, string fieldName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(fieldName);

        var matches = node.GetChildrenForField(fieldName).ToList();
        return matches.Count == 0 ? null : matches[0];
    }

    public static IReadOnlyList<Node> GetNamedChildrenForField(this Node node, string fieldName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(fieldName);

        return node.GetChildrenForField(fieldName)
            .Where(child => child.IsNamed)
            .ToList();
    }

    public static Node? FirstNamedChildOfType(this Node node, string type)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(type);

        var matches = node.NamedChildren
            .Where(child => string.Equals(child.Type, type, StringComparison.Ordinal))
            .ToList();

        return matches.Count == 0 ? null : matches[0];
    }

    public static string? TryGetStringLiteralContent(this Node node)
    {
        if (!string.Equals(node.Type, "string_literal", StringComparison.Ordinal))
            return null;

        var content = node.Children
            .Where(child => string.Equals(child.Type, "string_literal_content", StringComparison.Ordinal))
            .ToList();

        if (content.Count > 0)
            return content[0].Text;

        var text = node.Text;
        if (text.Length >= 2 && text[0] == '"' && text[^1] == '"')
            return text[1..^1];

        return text;
    }
}
