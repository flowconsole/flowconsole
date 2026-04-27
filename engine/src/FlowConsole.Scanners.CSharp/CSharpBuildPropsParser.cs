using System.Xml.Linq;

namespace FlowConsole.Scanners.CSharp;

public static class CSharpBuildPropsParser
{
    private static readonly string[] BuildPropFileNames =
    [
        "Directory.Build.props",
        "Directory.Build.targets"
    ];

    // Properties relevant for runtime inference and project classification
    private static readonly HashSet<string> SupportedProperties = new(StringComparer.OrdinalIgnoreCase)
    {
        "TargetFramework",
        "TargetFrameworks",
        "OutputType",
        "IsTestProject",
        "IsPackable",
        "Sdk",
        "RootNamespace",
        "AssemblyName",
        "LangVersion",
        "Nullable",
        "ImplicitUsings",
        "TreatWarningsAsErrors"
    };

    public static IReadOnlyList<BuildPropertyDescriptor> ParseForProject(string projectPath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(projectPath);

        var projectDir = File.Exists(projectPath)
            ? Path.GetDirectoryName(Path.GetFullPath(projectPath))!
            : Path.GetFullPath(projectPath);

        var results = new List<BuildPropertyDescriptor>();

        foreach (var fileName in BuildPropFileNames)
        {
            var found = FindNearestFile(projectDir, fileName);
            if (found is null) continue;

            var properties = ParseBuildFile(found);
            results.AddRange(properties);
        }

        return results;
    }

    private static string? FindNearestFile(string startDir, string fileName)
    {
        var current = new DirectoryInfo(startDir);

        while (current is not null)
        {
            var candidate = Path.Combine(current.FullName, fileName);
            if (File.Exists(candidate))
                return candidate;

            current = current.Parent;
        }

        return null;
    }

    private static IEnumerable<BuildPropertyDescriptor> ParseBuildFile(string filePath)
    {
        var doc = XDocument.Load(filePath);
        var root = doc.Root;
        if (root is null) yield break;

        var ns = root.Name.Namespace;

        foreach (var pg in root.Elements(ns + "PropertyGroup"))
        {
            foreach (var prop in pg.Elements())
            {
                var propName = prop.Name.LocalName;
                var propValue = prop.Value;

                if (string.IsNullOrWhiteSpace(propValue)) continue;
                if (!SupportedProperties.Contains(propName)) continue;

                yield return new BuildPropertyDescriptor(filePath, propName, propValue);
            }
        }
    }
}
