using FlowConsole.Core.Evidence;

namespace FlowConsole.Scanners.CSharp;

/// <summary>
/// Builds application boundaries from ProjectReference graphs.
/// Runtime roots are non-library, non-test projects. Each root owns
/// the transitive closure of its ProjectReferences, excluding other roots.
/// Projects reachable from multiple roots are classified as shared.
/// </summary>
public static class CSharpBoundaryInferer
{
    public static IReadOnlyList<ApplicationBoundary> Infer(
        IReadOnlyList<ProjectDescriptor> allProjects,
        IReadOnlyDictionary<string, InferenceResult<RuntimeCandidateKind>> runtimeResults)
    {
        ArgumentNullException.ThrowIfNull(allProjects);
        ArgumentNullException.ThrowIfNull(runtimeResults);

        // Build lookup: project name -> ProjectDescriptor
        var projectByName = new Dictionary<string, ProjectDescriptor>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in allProjects)
        {
            projectByName.TryAdd(p.Name, p);
        }

        // Identify runtime roots: non-library, non-test runtime projects
        var runtimeRoots = new List<string>();
        foreach (var (projectName, inference) in runtimeResults)
        {
            if (!projectByName.TryGetValue(projectName, out var descriptor))
                continue;

            if (descriptor.IsTestProject || AspireAppHostEvidenceCollector.IsSupportedAppHostProject(descriptor))
                continue;

            if (inference.SelectedValue is not RuntimeCandidateKind.Library
                and not RuntimeCandidateKind.TestProject)
            {
                runtimeRoots.Add(projectName);
            }
        }

        var runtimeRootSet = new HashSet<string>(runtimeRoots, StringComparer.OrdinalIgnoreCase);

        // Compute reachable closure per root (excluding other runtime roots)
        var closures = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var root in runtimeRoots)
        {
            closures[root] = ComputeClosure(root, projectByName, runtimeRootSet);
        }

        // Classify owned vs shared: a project is shared if reachable from multiple roots
        var reachCount = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var (_, closure) in closures)
        {
            foreach (var project in closure)
            {
                reachCount.TryGetValue(project, out var count);
                reachCount[project] = count + 1;
            }
        }

        var boundaries = new List<ApplicationBoundary>();
        foreach (var root in runtimeRoots)
        {
            if (!runtimeResults.TryGetValue(root, out var inference))
                continue;

            if (!projectByName.TryGetValue(root, out var rootDescriptor))
                continue;

            var closure = closures[root];
            var owned = new List<string>();
            var shared = new List<string>();

            foreach (var project in closure)
            {
                if (reachCount.TryGetValue(project, out var count) && count > 1)
                    shared.Add(project);
                else
                    owned.Add(project);
            }

            owned.Sort(StringComparer.OrdinalIgnoreCase);
            shared.Sort(StringComparer.OrdinalIgnoreCase);

            boundaries.Add(new ApplicationBoundary(
                RootProjectName: root,
                RootProjectPath: rootDescriptor.Path,
                RuntimeKind: inference.SelectedValue,
                Confidence: inference.Confidence,
                OwnedProjects: owned,
                SharedProjects: shared));
        }

        return boundaries;
    }

    private static HashSet<string> ComputeClosure(
        string root,
        Dictionary<string, ProjectDescriptor> projectByName,
        HashSet<string> runtimeRootSet)
    {
        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var queue = new Queue<string>();

        // Start from root's direct references
        if (projectByName.TryGetValue(root, out var rootProject))
        {
            foreach (var refName in rootProject.ProjectReferences)
            {
                var name = ExtractProjectName(refName);
                if (!runtimeRootSet.Contains(name))
                    queue.Enqueue(name);
            }
        }

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();

            if (!visited.Add(current))
                continue;

            if (projectByName.TryGetValue(current, out var descriptor))
            {
                foreach (var refName in descriptor.ProjectReferences)
                {
                    var name = ExtractProjectName(refName);
                    if (!runtimeRootSet.Contains(name) && !visited.Contains(name))
                        queue.Enqueue(name);
                }
            }
        }

        return visited;
    }

    private static string ExtractProjectName(string projectReference)
    {
        // ProjectReferences can be paths like "../Core/Core.csproj" or just names like "Core"
        var fileName = Path.GetFileNameWithoutExtension(projectReference);
        return string.IsNullOrEmpty(fileName) ? projectReference : fileName;
    }
}
