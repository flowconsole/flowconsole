using FlowConsole.Core.Entities;
using FlowConsole.Core.Evidence;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Scanners.Core;

namespace FlowConsole.Scanners.CSharp;

/// <summary>
/// Architecture-aware C# code parser. Orchestrates the full evidence-first pipeline:
/// detect solution → parse metadata → collect evidence → infer runtime/boundaries →
/// project to typed Elements/Relationships → assemble ModelSnapshot.
/// Calls IAdjudicator for low-confidence runtime inference results.
/// </summary>
public sealed class CSharpCodeParser : FlowConsole.Scanners.Core.ICodeParser, FlowConsole.Core.Interfaces.ICodeParser
{
    private readonly IAdjudicator _adjudicator;

    public CSharpCodeParser(IAdjudicator adjudicator)
    {
        ArgumentNullException.ThrowIfNull(adjudicator);
        _adjudicator = adjudicator;
    }

    public string Language => "csharp";
    public IReadOnlyList<string> FileExtensions => [".cs", ".csproj", ".sln", ".slnx"];

    public async Task<ModelSnapshot> ParseProjectAsync(
        string projectPath,
        CodeParserOptions options,
        CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(projectPath);

        if (!Directory.Exists(projectPath))
            return EmptySnapshot();

        // Step 1: Discover projects
        var projects = DiscoverProjects(projectPath);
        if (projects.Count == 0)
            return EmptySnapshot();

        // Step 2: Parse metadata for each project
        var projectDescriptors = new List<ProjectDescriptor>();
        foreach (var csprojPath in projects)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                var descriptor = CSharpProjectFileParser.Parse(csprojPath);

                // Enrich with Directory.Build.props
                var buildProps = CSharpBuildPropsParser.ParseForProject(csprojPath);
                descriptor = ApplyBuildProps(descriptor, buildProps);

                projectDescriptors.Add(descriptor);
            }
            catch (Exception)
            {
                //TODO LOGGING Skip projects that cannot be parsed
            }
        }

        if (projectDescriptors.Count == 0)
            return EmptySnapshot();

        // Step 2.5: Collect optional AppHost topology from non-test AppHost projects
        var aspireTopology = CollectAspireTopology(projectDescriptors);

        // Step 3: Collect evidence for all projects
        var allEvidence = new Dictionary<string, List<EvidenceRecord>>(StringComparer.OrdinalIgnoreCase);

        foreach (var descriptor in projectDescriptors)
        {
            ct.ThrowIfCancellationRequested();

            var projectDir = Path.GetDirectoryName(descriptor.Path)!;
            var evidence = new List<EvidenceRecord>();

            // Metadata evidence
            evidence.AddRange(CSharpMetadataEvidenceCollector.Collect(descriptor));

            // Runtime evidence (Tree-sitter based)
            evidence.AddRange(CSharpRuntimeEvidenceCollector.Collect(projectDir, descriptor));

            // Capability evidence
            var csFiles = GetSourceFiles(projectDir);
            evidence.AddRange(CSharpCapabilityCollector.Collect(projectDir, csFiles));

            // Outbound evidence
            evidence.AddRange(CSharpOutboundEvidenceCollector.Collect(projectDir, csFiles));

            // Config hint evidence
            evidence.AddRange(CSharpConfigHintCollector.Collect(projectDir));

            allEvidence[descriptor.Name] = evidence;
        }

        // Step 4: Infer runtime kind per project (with optional LLM adjudication)
        var runtimeResults = new Dictionary<string, InferenceResult<RuntimeCandidateKind>>(StringComparer.OrdinalIgnoreCase);
        foreach (var descriptor in projectDescriptors)
        {
            ct.ThrowIfCancellationRequested();
            var evidence = allEvidence.GetValueOrDefault(descriptor.Name) ?? [];
            var result = CSharpRuntimeInferer.Infer(descriptor, evidence);

            // Adjudicate low-confidence or ambiguous results
            result = await TryAdjudicateRuntimeResult(result, evidence, descriptor.Name, ct);

            runtimeResults[descriptor.Name] = result;
        }

        // Step 5: Infer boundaries
        var boundaries = CSharpBoundaryInferer.Infer(projectDescriptors, runtimeResults);

        // Step 6: Prepare capability and outbound evidence lookups
        var capabilityEvidence = new Dictionary<string, IReadOnlyList<EvidenceRecord>>(StringComparer.OrdinalIgnoreCase);
        var outboundEvidence = new Dictionary<string, IReadOnlyList<EvidenceRecord>>(StringComparer.OrdinalIgnoreCase);

        foreach (var (name, evidence) in allEvidence)
        {
            capabilityEvidence[name] = evidence
                .Where(e => e.EvidenceKind == EvidenceKind.Capability)
                .ToList();
            outboundEvidence[name] = evidence
                .Where(e => e.EvidenceKind == EvidenceKind.OutboundCommunication)
                .ToList();
        }

        // Step 7: Project directly to typed Elements and Relationships
        var (elements, relationships) = CSharpConceptProjector.Project(
            boundaries, capabilityEvidence, outboundEvidence, aspireTopology,
            repoRootPath: projectPath);

        // Step 8: Assemble ModelSnapshot
        return new ModelSnapshot(ElementSource.CodeScan, elements, relationships);
    }

    /// <summary>
    /// Calls LLM adjudicator for low-confidence or ambiguous (unresolved with diagnostics)
    /// runtime inference results. High-confidence results are never sent to LLM.
    /// Accepts SuggestAlternative only if LLM confidence >= Medium, suggested value is a
    /// valid RuntimeCandidateKind, and the deterministic baseline was Low or unresolved.
    /// </summary>
    private async Task<InferenceResult<RuntimeCandidateKind>> TryAdjudicateRuntimeResult(
        InferenceResult<RuntimeCandidateKind> result,
        IReadOnlyList<EvidenceRecord> evidence,
        string projectName,
        CancellationToken ct)
    {
        if (!_adjudicator.IsAvailable)
            return result;

        // Only adjudicate low-confidence or unresolved cases
        if (result.Confidence != Confidence.Low)
            return result;

        var review = await _adjudicator.ReviewAsync(
            result,
            evidence,
            $"What is the runtime classification for C# project '{projectName}'?",
            ct);

        return ApplyReviewToRuntimeResult(result, review);
    }

    public static InferenceResult<RuntimeCandidateKind> ApplyReviewToRuntimeResult(
        InferenceResult<RuntimeCandidateKind> baseline,
        ArchitectureInferenceReviewResult review)
    {
        switch (review.Verdict)
        {
            case InferenceReviewVerdict.Confirm:
                return baseline;

            case InferenceReviewVerdict.SuggestAlternative:
                // Accept only if LLM confidence >= Medium and suggested value is valid
                // Enum: High=0, Medium=1, Low=2 — so >= Medium means numeric value <= Medium
                if (review.Confidence > Confidence.Medium)
                    return baseline;

                if (review.SuggestedValue is null ||
                    !Enum.TryParse<RuntimeCandidateKind>(review.SuggestedValue, ignoreCase: true, out var suggested))
                    return baseline;

                // Only accept if deterministic baseline was Low (already checked in caller)
                return baseline with
                {
                    SelectedValue = suggested,
                    Confidence = review.Confidence,
                    Diagnostics = $"LLM adjudication: {review.Rationale}"
                };

            case InferenceReviewVerdict.KeepUnresolved:
            default:
                return baseline;
        }
    }

    private static IReadOnlyList<string> DiscoverProjects(string projectPath)
    {
        // Try to find solution files first
        var slnFiles = Directory.EnumerateFiles(projectPath, "*.sln", SearchOption.TopDirectoryOnly).ToList();
        var slnxFiles = Directory.EnumerateFiles(projectPath, "*.slnx", SearchOption.TopDirectoryOnly).ToList();

        // Prefer .slnx over .sln
        var solutionFile = slnxFiles.FirstOrDefault() ?? slnFiles.FirstOrDefault();

        if (solutionFile is not null)
        {
            try
            {
                var solution = CSharpSolutionFileParser.Parse(solutionFile);
                var existingProjects = solution.Projects
                    .Where(p => File.Exists(p.AbsolutePath))
                    .Select(p => p.AbsolutePath)
                    .ToList();

                if (existingProjects.Count > 0)
                    return existingProjects;
            }
            catch (Exception)
            {
                // Fall through to discovery
            }
        }

        // No solution file or solution parsing failed: discover .csproj files
        return Directory.EnumerateFiles(projectPath, "*.csproj", SearchOption.AllDirectories)
            .Where(f => !IsExcludedPath(f, projectPath))
            .ToList();
    }

    private static ProjectDescriptor ApplyBuildProps(
        ProjectDescriptor descriptor,
        IReadOnlyList<BuildPropertyDescriptor> buildProps)
    {
        if (buildProps.Count == 0)
            return descriptor;

        var targetFramework = descriptor.TargetFramework;
        var outputType = descriptor.OutputType;
        var isPackable = descriptor.IsPackable;

        foreach (var prop in buildProps)
        {
            switch (prop.PropertyName)
            {
                case "TargetFramework" or "TargetFrameworks" when targetFramework is null:
                    targetFramework = prop.PropertyValue;
                    break;
                case "OutputType" when outputType is null:
                    outputType = prop.PropertyValue;
                    break;
                case "IsPackable" when isPackable is null:
                    isPackable = string.Equals(prop.PropertyValue, "true", StringComparison.OrdinalIgnoreCase);
                    break;
            }
        }

        if (targetFramework == descriptor.TargetFramework &&
            outputType == descriptor.OutputType &&
            isPackable == descriptor.IsPackable)
        {
            return descriptor;
        }

        return descriptor with
        {
            TargetFramework = targetFramework,
            OutputType = outputType,
            IsPackable = isPackable
        };
    }

    private static AspireTopologyModel CollectAspireTopology(IReadOnlyList<ProjectDescriptor> projectDescriptors)
    {
        var models = new List<AspireTopologyModel>();

        foreach (var descriptor in projectDescriptors.Where(AspireAppHostEvidenceCollector.IsSupportedAppHostProject))
        {
            var projectDir = Path.GetDirectoryName(descriptor.Path);
            if (string.IsNullOrWhiteSpace(projectDir))
                continue;

            var model = AspireAppHostEvidenceCollector.Collect(projectDir, descriptor, projectDescriptors);
            if (model.Resources.Count > 0 || model.Links.Count > 0)
                models.Add(model);
        }

        if (models.Count == 0)
            return AspireTopologyModel.Empty;

        var resources = models
            .SelectMany(model => model.Resources)
            .GroupBy(resource => resource.ResourceId, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.Last())
            .ToList();

        var links = models
            .SelectMany(model => model.Links)
            .GroupBy(link => $"{link.SourceResourceId}|{link.LinkKind}|{link.TargetResourceId}|{link.EvidenceLabel}",
                StringComparer.OrdinalIgnoreCase)
            .Select(group => group.Last())
            .ToList();

        return new AspireTopologyModel(resources, links);
    }

    private static IReadOnlyList<string> GetSourceFiles(string projectDir)
    {
        if (!Directory.Exists(projectDir))
            return [];

        return Directory.EnumerateFiles(projectDir, "*.cs", SearchOption.AllDirectories)
            .Where(f => !IsExcludedPath(f, projectDir))
            .ToList();
    }

    private static bool IsExcludedPath(string filePath, string rootPath)
    {
        var relative = Path.GetRelativePath(rootPath, filePath).Replace('\\', '/');
        return relative.Contains("/bin/") || relative.Contains("/obj/") ||
               relative.StartsWith("bin/") || relative.StartsWith("obj/") ||
               relative.Contains("/.git/") || relative.StartsWith(".git/") ||
               relative.Contains("/node_modules/") || relative.StartsWith("node_modules/");
    }

    private static ModelSnapshot EmptySnapshot() => new(ElementSource.CodeScan, [], []);
}
