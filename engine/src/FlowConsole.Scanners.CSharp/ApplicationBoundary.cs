using FlowConsole.Core.Evidence;

namespace FlowConsole.Scanners.CSharp;

/// <summary>
/// Represents an application boundary built from a runtime root project
/// and its owned/shared project closures.
/// </summary>
public sealed record ApplicationBoundary(
    string RootProjectName,
    string RootProjectPath,
    RuntimeCandidateKind RuntimeKind,
    Confidence Confidence,
    IReadOnlyList<string> OwnedProjects,
    IReadOnlyList<string> SharedProjects);
