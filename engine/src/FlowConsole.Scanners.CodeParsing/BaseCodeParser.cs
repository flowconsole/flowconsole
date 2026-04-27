using FlowConsole.Core.Entities;
using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Entities.Relations;
using FlowConsole.Core.Factories;
using FlowConsole.Core.ValueObjects;
using TreeSitter;

namespace FlowConsole.Scanners.CodeParsing;

public abstract class BaseCodeParser : FlowConsole.Scanners.Core.ICodeParser, FlowConsole.Core.Interfaces.ICodeParser
{
    public abstract string Language { get; }
    public abstract IReadOnlyList<string> FileExtensions { get; }

    protected abstract string TreeSitterLanguageName { get; }

    public async Task<ModelSnapshot> ParseProjectAsync(
        string projectPath,
        CodeParserOptions options,
        CancellationToken ct = default)
    {
        var elements = new List<ElementBase>();
        var relationships = new List<RelationshipBase>();

        var files = GetSourceFiles(projectPath, options);

        using var language = new TreeSitter.Language(TreeSitterLanguageName);

        foreach (var filePath in files)
        {
            ct.ThrowIfCancellationRequested();

            var fileInfo = new FileInfo(filePath);
            if (fileInfo.Length > options.MaxFileSizeBytes)
                continue;

            var content = await File.ReadAllTextAsync(filePath, ct);
            var relativePath = Path.GetRelativePath(projectPath, filePath)
                .Replace('\\', '/');

            using var parser = new Parser(language);
            using var tree = parser.Parse(content);
            if (tree == null) continue;

            ExtractFromTree(tree.RootNode, content, relativePath, elements, relationships);
        }

        return new ModelSnapshot(
            ElementSource.CodeScan,
            elements,
            relationships);
    }

    protected abstract void ExtractFromTree(
        Node root,
        string source,
        string filePath,
        List<ElementBase> elements,
        List<RelationshipBase> relationships);

    protected ElementBase CreateElement(
        ElementKind kind,
        string id,
        string name,
        string? description = null,
        string? technology = null,
        string? parentId = null,
        IReadOnlyDictionary<string, string>? properties = null)
    {
        return ElementFactory.Create(
            kind,
            new ElementId(id),
            name,
            ElementSource.CodeScan,
            description: description,
            technology: technology,
            parentId: parentId != null ? new ElementId(parentId) : null,
            properties: properties);
    }

    protected RelationshipBase CreateRelationship(
        RelationKind kind,
        string id,
        string sourceId,
        string targetId,
        string? label = null,
        string? technology = null,
        IReadOnlyDictionary<string, string>? properties = null)
    {
        return RelationshipFactory.Create(
            kind,
            new RelationshipId(id),
            new ElementId(sourceId),
            new ElementId(targetId),
            ElementSource.CodeScan,
            label: label,
            technology: technology,
            properties: properties);
    }

    protected string MakeElementId(string filePath, string name)
    {
        var encoded = Uri.EscapeDataString(filePath);
        return $"{Language}:{encoded}:{name}";
    }

    protected string MakeRelationshipId(string sourceId, string targetId, string type)
        => $"rel:{type}:{sourceId}:{targetId}";

    protected static Node? FindChildByType(Node node, params string[] types)
        => node.Children.FirstOrDefault(c => types.Contains(c.Type));

    protected static IEnumerable<Node> FindChildrenByType(Node node, string type)
        => node.Children.Where(c => c.Type == type);

    protected static void WalkNodes(Node node, Action<Node> visitor)
    {
        visitor(node);
        foreach (var child in node.Children)
            WalkNodes(child, visitor);
    }

    private IEnumerable<string> GetSourceFiles(string projectPath, CodeParserOptions options)
    {
        if (!Directory.Exists(projectPath))
            return [];

        var allFiles = FileExtensions
            .SelectMany(ext => Directory.EnumerateFiles(projectPath, $"*{ext}", SearchOption.AllDirectories))
            .Distinct()
            .Where(f => !IsExcluded(f, projectPath, options))
            .ToList();

        if (options.IncludePaths.Count > 0)
            allFiles = allFiles.Where(f => IsIncluded(f, projectPath, options)).ToList();

        return allFiles;
    }

    private static bool IsExcluded(string filePath, string projectPath, CodeParserOptions options)
    {
        var relative = Path.GetRelativePath(projectPath, filePath).Replace('\\', '/');
        return options.ExcludePaths.Any(excluded =>
            relative.StartsWith(excluded + "/", StringComparison.OrdinalIgnoreCase) ||
            relative.Contains("/" + excluded + "/", StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsIncluded(string filePath, string projectPath, CodeParserOptions options)
    {
        var relative = Path.GetRelativePath(projectPath, filePath).Replace('\\', '/');
        return options.IncludePaths.Any(included =>
            relative.StartsWith(included, StringComparison.OrdinalIgnoreCase));
    }
}
