using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace FlowConsole.Scanners.CSharp;

public static partial class CSharpSolutionFileParser
{
    // Regex for extracting Project(...) entries from .sln files.
    // Format: Project("{typeGuid}") = "Name", "RelativePath", "{projectGuid}"
    [GeneratedRegex(
        @"^Project\(""\{[^}]+\}""\)\s*=\s*""([^""]+)""\s*,\s*""([^""]+)""",
        RegexOptions.None)]
    private static partial Regex SlnProjectEntryRegex();

    public static SolutionDescriptor Parse(string solutionFilePath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(solutionFilePath);

        var fullPath = Path.GetFullPath(solutionFilePath);
        var extension = Path.GetExtension(fullPath);

        return extension.Equals(".slnx", StringComparison.OrdinalIgnoreCase)
            ? ParseSlnx(fullPath)
            : ParseSln(fullPath);
    }

    private static SolutionDescriptor ParseSln(string fullPath)
    {
        var solutionDir = Path.GetDirectoryName(fullPath)!;
        var lines = File.ReadAllLines(fullPath);
        var projects = new List<SolutionProjectEntry>();
        var regex = SlnProjectEntryRegex();

        foreach (var line in lines)
        {
            var match = regex.Match(line);
            if (!match.Success) continue;

            var name = match.Groups[1].Value;
            var relativePath = match.Groups[2].Value.Replace('\\', Path.DirectorySeparatorChar);

            // Skip solution folders (they have no file extension or end in a GUID-like pattern)
            if (!relativePath.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase) &&
                !relativePath.EndsWith(".fsproj", StringComparison.OrdinalIgnoreCase) &&
                !relativePath.EndsWith(".vbproj", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var absolutePath = Path.GetFullPath(Path.Combine(solutionDir, relativePath));
            projects.Add(new SolutionProjectEntry(name, relativePath, absolutePath));
        }

        return new SolutionDescriptor(fullPath, projects);
    }

    private static SolutionDescriptor ParseSlnx(string fullPath)
    {
        var solutionDir = Path.GetDirectoryName(fullPath)!;
        var doc = XDocument.Load(fullPath);
        var projects = new List<SolutionProjectEntry>();

        var root = doc.Root;
        if (root is null)
            return new SolutionDescriptor(fullPath, projects);

        // .slnx format: <Solution> -> <Project Path="relative/path.csproj" />
        // or <Solution> -> <Folder> -> <Project Path="..." />
        foreach (var projectElement in root.Descendants("Project"))
        {
            var pathAttr = projectElement.Attribute("Path")?.Value;
            if (string.IsNullOrWhiteSpace(pathAttr)) continue;

            var relativePath = pathAttr.Replace('\\', Path.DirectorySeparatorChar);

            // Skip non-project entries
            if (!relativePath.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase) &&
                !relativePath.EndsWith(".fsproj", StringComparison.OrdinalIgnoreCase) &&
                !relativePath.EndsWith(".vbproj", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var absolutePath = Path.GetFullPath(Path.Combine(solutionDir, relativePath));
            var name = Path.GetFileNameWithoutExtension(relativePath);

            projects.Add(new SolutionProjectEntry(name, relativePath, absolutePath));
        }

        return new SolutionDescriptor(fullPath, projects);
    }
}
