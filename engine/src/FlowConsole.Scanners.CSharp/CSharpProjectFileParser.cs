using System.Xml.Linq;

namespace FlowConsole.Scanners.CSharp;

public static class CSharpProjectFileParser
{
    private static readonly HashSet<string> TestPackageIndicators = new(StringComparer.OrdinalIgnoreCase)
    {
        "Microsoft.NET.Test.Sdk",
        "xunit",
        "xunit.core",
        "xunit.runner.visualstudio",
        "NUnit",
        "NUnit3TestAdapter",
        "MSTest.TestAdapter",
        "MSTest.TestFramework",
        "FluentAssertions",
        "NSubstitute",
        "Moq",
        "coverlet.collector",
        "coverlet.msbuild"
    };

    public static ProjectDescriptor Parse(string csprojPath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(csprojPath);

        var fullPath = Path.GetFullPath(csprojPath);
        var doc = XDocument.Load(fullPath);
        var root = doc.Root;

        if (root is null)
        {
            return new ProjectDescriptor(
                fullPath,
                Path.GetFileNameWithoutExtension(fullPath),
                Sdk: null,
                TargetFramework: null,
                OutputType: null,
                PackageReferences: [],
                ProjectReferences: [],
                IsTestProject: false,
                IsPackable: null);
        }

        var ns = root.Name.Namespace;

        // SDK attribute on <Project Sdk="...">
        var sdk = root.Attribute("Sdk")?.Value;

        // Properties from all PropertyGroup elements
        string? targetFramework = null;
        string? outputType = null;
        bool? isTestProjectProp = null;
        bool? isPackable = null;

        foreach (var pg in root.Elements(ns + "PropertyGroup"))
        {
            targetFramework ??= pg.Element(ns + "TargetFramework")?.Value
                                ?? pg.Element(ns + "TargetFrameworks")?.Value;
            outputType ??= pg.Element(ns + "OutputType")?.Value;

            var testPropValue = pg.Element(ns + "IsTestProject")?.Value;
            if (testPropValue is not null)
                isTestProjectProp = string.Equals(testPropValue, "true", StringComparison.OrdinalIgnoreCase);

            var packableValue = pg.Element(ns + "IsPackable")?.Value;
            if (packableValue is not null)
                isPackable = string.Equals(packableValue, "true", StringComparison.OrdinalIgnoreCase);
        }

        // Package references
        var packageReferences = root
            .Descendants(ns + "PackageReference")
            .Select(e => e.Attribute("Include")?.Value)
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Select(v => v!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        // Project references
        var projectReferences = root
            .Descendants(ns + "ProjectReference")
            .Select(e => e.Attribute("Include")?.Value)
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Select(v => v!.Replace('\\', Path.DirectorySeparatorChar))
            .ToList();

        // Detect test project: explicit property, known test packages, or naming/path conventions.
        var isTestProject = isTestProjectProp == true
                            || packageReferences.Any(IsTestPackageIndicator)
                            || IsTestProjectByConvention(fullPath);

        return new ProjectDescriptor(
            fullPath,
            Path.GetFileNameWithoutExtension(fullPath),
            sdk,
            targetFramework,
            outputType,
            packageReferences,
            projectReferences,
            isTestProject,
            isPackable);
    }

    private static bool IsTestPackageIndicator(string packageName)
    {
        if (TestPackageIndicators.Contains(packageName))
            return true;

        return packageName.StartsWith("xunit.", StringComparison.OrdinalIgnoreCase) ||
               packageName.StartsWith("xunit.v3", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(packageName, "Microsoft.AspNetCore.TestHost", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(packageName, "Microsoft.AspNetCore.Mvc.Testing", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsTestProjectByConvention(string fullPath)
    {
        var projectName = Path.GetFileNameWithoutExtension(fullPath);
        if (projectName.EndsWith("Tests", StringComparison.OrdinalIgnoreCase) ||
            projectName.Contains(".Tests", StringComparison.OrdinalIgnoreCase) ||
            projectName.Contains("UnitTests", StringComparison.OrdinalIgnoreCase) ||
            projectName.Contains("IntegrationTests", StringComparison.OrdinalIgnoreCase) ||
            projectName.Contains("FunctionalTests", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // Check if the project sits directly under a "tests" directory
        // (e.g. repo/tests/MyProj/MyProj.csproj). We look at the grandparent
        // of the .csproj — that is the parent of the project folder.
        // Using only the immediate ancestor avoids false positives when the
        // absolute path happens to contain "/tests/" higher up (e.g. test fixtures).
        var projectDir = Path.GetDirectoryName(fullPath);
        var parentOfProjectDir = projectDir is null ? null : Path.GetDirectoryName(projectDir);
        var parentDirName = parentOfProjectDir is null ? null : Path.GetFileName(parentOfProjectDir);
        return string.Equals(parentDirName, "tests", StringComparison.OrdinalIgnoreCase)
            || string.Equals(parentDirName, "test", StringComparison.OrdinalIgnoreCase);
    }
}
