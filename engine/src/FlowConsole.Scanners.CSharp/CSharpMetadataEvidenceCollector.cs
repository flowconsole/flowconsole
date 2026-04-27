using FlowConsole.Core.Evidence;

namespace FlowConsole.Scanners.CSharp;

public static class CSharpMetadataEvidenceCollector
{
    private const string SourceAdapter = "csharp-metadata";

    public static IReadOnlyList<EvidenceRecord> Collect(ProjectDescriptor project)
    {
        ArgumentNullException.ThrowIfNull(project);

        var evidence = new List<EvidenceRecord>();

        // ProjectDescriptor evidence for Sdk, OutputType, TargetFramework
        if (!string.IsNullOrEmpty(project.Sdk))
        {
            evidence.Add(new EvidenceRecord(
                Subject: project.Name,
                EvidenceKind: EvidenceKind.ProjectDescriptor,
                EvidenceValue: $"Sdk:{project.Sdk}",
                Location: null,
                OriginFile: project.Path,
                SourceAdapter: SourceAdapter,
                WeightHint: null));
        }

        if (!string.IsNullOrEmpty(project.OutputType))
        {
            evidence.Add(new EvidenceRecord(
                Subject: project.Name,
                EvidenceKind: EvidenceKind.ProjectDescriptor,
                EvidenceValue: $"OutputType:{project.OutputType}",
                Location: null,
                OriginFile: project.Path,
                SourceAdapter: SourceAdapter,
                WeightHint: null));
        }

        if (!string.IsNullOrEmpty(project.TargetFramework))
        {
            evidence.Add(new EvidenceRecord(
                Subject: project.Name,
                EvidenceKind: EvidenceKind.ProjectDescriptor,
                EvidenceValue: $"TargetFramework:{project.TargetFramework}",
                Location: null,
                OriginFile: project.Path,
                SourceAdapter: SourceAdapter,
                WeightHint: null));
        }

        // ProjectDependency evidence for PackageReferences
        foreach (var pkg in project.PackageReferences)
        {
            evidence.Add(new EvidenceRecord(
                Subject: project.Name,
                EvidenceKind: EvidenceKind.ProjectDependency,
                EvidenceValue: $"PackageReference:{pkg}",
                Location: null,
                OriginFile: project.Path,
                SourceAdapter: SourceAdapter,
                WeightHint: null));
        }

        // ProjectDependency evidence for ProjectReferences
        foreach (var projRef in project.ProjectReferences)
        {
            evidence.Add(new EvidenceRecord(
                Subject: project.Name,
                EvidenceKind: EvidenceKind.ProjectDependency,
                EvidenceValue: $"ProjectReference:{projRef}",
                Location: null,
                OriginFile: project.Path,
                SourceAdapter: SourceAdapter,
                WeightHint: null));
        }

        // If IsTestProject -> RuntimeCandidate:TestProject with WeightHint = 100
        if (project.IsTestProject)
        {
            evidence.Add(new EvidenceRecord(
                Subject: project.Name,
                EvidenceKind: EvidenceKind.RuntimeCandidate,
                EvidenceValue: $"RuntimeCandidate:{RuntimeCandidateKind.TestProject}",
                Location: null,
                OriginFile: project.Path,
                SourceAdapter: SourceAdapter,
                WeightHint: 100));
        }

        return evidence;
    }
}
