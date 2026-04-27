namespace FlowConsole.Scanners.CSharp;

public sealed record SolutionDescriptor(
    string SolutionPath,
    IReadOnlyList<SolutionProjectEntry> Projects);

public sealed record SolutionProjectEntry(
    string Name,
    string RelativePath,
    string AbsolutePath);

public sealed record ProjectDescriptor(
    string Path,
    string Name,
    string? Sdk,
    string? TargetFramework,
    string? OutputType,
    IReadOnlyList<string> PackageReferences,
    IReadOnlyList<string> ProjectReferences,
    bool IsTestProject,
    bool? IsPackable);

public sealed record BuildPropertyDescriptor(
    string SourceFile,
    string PropertyName,
    string PropertyValue);
