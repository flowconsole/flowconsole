using FlowConsole.Core.Evidence;
using FlowConsole.Scanners.CodeParsing.TreeSitterSupport;
using TreeSitter;

namespace FlowConsole.Scanners.CSharp;

public static class AspireAppHostEvidenceCollector
{
    private const int MaxFileSizeBytes = 1_048_576;

    private sealed record ResourceRef(string ResourceId, AspireResourceKind Kind, string Name);
    private sealed record RouteTargetDescriptor(string TargetParameterName, string Label);
    private sealed record RouteMethodDefinition(
        string Name,
        IReadOnlyList<string> ParameterNames,
        IReadOnlyList<RouteTargetDescriptor> RouteTargets);

    public static bool IsSupportedAppHostProject(ProjectDescriptor project)
    {
        ArgumentNullException.ThrowIfNull(project);

        if (project.IsTestProject)
            return false;

        if (project.Sdk?.Contains("Aspire.AppHost.Sdk", StringComparison.OrdinalIgnoreCase) == true)
            return true;

        return project.PackageReferences.Any(package =>
            package.StartsWith("Aspire.Hosting", StringComparison.OrdinalIgnoreCase));
    }

    public static AspireTopologyModel Collect(
        string projectDir,
        ProjectDescriptor appHostProject,
        IReadOnlyList<ProjectDescriptor> allProjects)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(projectDir);
        ArgumentNullException.ThrowIfNull(appHostProject);
        ArgumentNullException.ThrowIfNull(allProjects);

        if (!Directory.Exists(projectDir))
            return AspireTopologyModel.Empty;

        var projectLookup = BuildProjectLookup(allProjects);
        var routeMethods = new Dictionary<string, RouteMethodDefinition>(StringComparer.Ordinal);
        var parsedFiles = new List<(string RelativePath, string Source)>();

        using var language = new Language("c-sharp");

        foreach (var filePath in Directory.EnumerateFiles(projectDir, "*.cs", SearchOption.AllDirectories)
                     .Where(path => !IsExcludedPath(path, projectDir)))
        {
            var fileInfo = new FileInfo(filePath);
            if (!fileInfo.Exists || fileInfo.Length > MaxFileSizeBytes)
                continue;

            var relativePath = Path.GetRelativePath(projectDir, filePath).Replace('\\', '/');
            var source = File.ReadAllText(filePath);
            using var parser = new Parser(language);
            using var tree = parser.Parse(source);
            if (tree is null)
                continue;

            parsedFiles.Add((relativePath, source));
            CollectRouteMethods(tree.RootNode, routeMethods);
        }

        if (parsedFiles.Count == 0)
            return AspireTopologyModel.Empty;

        var resources = new Dictionary<string, AspireResourceDescriptor>(StringComparer.OrdinalIgnoreCase);
        var links = new Dictionary<string, AspireTopologyLinkDescriptor>(StringComparer.OrdinalIgnoreCase);
        var resourceAliases = new Dictionary<string, ResourceRef>(StringComparer.Ordinal);
        var endpointAliases = new Dictionary<string, ResourceRef>(StringComparer.Ordinal);

        foreach (var (relativePath, source) in parsedFiles)
        {
            using var parser = new Parser(language);
            using var tree = parser.Parse(source);
            if (tree is null)
                continue;

            ProcessGlobalStatements(
                tree.RootNode,
                tree.RootNode,
                relativePath,
                appHostProject.Name,
                projectLookup,
                routeMethods,
                resources,
                links,
                resourceAliases,
                endpointAliases);
        }

        return new AspireTopologyModel(
            resources.Values.OrderBy(resource => resource.ResourceId, StringComparer.Ordinal).ToList(),
            links.Values.OrderBy(link => link.SourceResourceId, StringComparer.Ordinal)
                .ThenBy(link => link.TargetResourceId, StringComparer.Ordinal)
                .ThenBy(link => link.EvidenceLabel, StringComparer.Ordinal)
                .ToList());
    }

    public static bool? ResolveConstantBoolean(Node expression, Node fileRoot)
    {
        return CSharpAstHelpers.TryResolveBooleanConstant(expression, fileRoot);
    }

    private static Dictionary<string, ProjectDescriptor> BuildProjectLookup(IReadOnlyList<ProjectDescriptor> allProjects)
    {
        var lookup = new Dictionary<string, ProjectDescriptor>(StringComparer.Ordinal);

        foreach (var project in allProjects.Where(project => !project.IsTestProject))
        {
            var keys = new[]
            {
                Normalize(project.Name),
                Normalize(Path.GetFileNameWithoutExtension(project.Path)),
            };

            foreach (var key in keys.Where(key => !string.IsNullOrWhiteSpace(key)))
                lookup.TryAdd(key, project);
        }

        return lookup;
    }

    private static void CollectRouteMethods(Node rootNode, Dictionary<string, RouteMethodDefinition> routeMethods)
    {
        foreach (var methodNode in rootNode.DescendantsOfType("method_declaration", "local_function_statement"))
        {
            var nameNode = methodNode.TryGetChildForField("name") ??
                           methodNode.FirstNamedChildOfType("identifier");
            var bodyNode = methodNode.TryGetChildForField("body");
            var parametersNode = methodNode.TryGetChildForField("parameters");
            if (nameNode is null || bodyNode is null || parametersNode is null)
                continue;

            var parameterNames = parametersNode
                .NamedChildren
                .Where(child => string.Equals(child.Type, "parameter", StringComparison.Ordinal))
                .Select(child => child.TryGetChildForField("name")?.Text)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Cast<string>()
                .ToList();

            var routeTargets = CollectRouteTargets(bodyNode, parameterNames);

            routeMethods[nameNode.Text] = new RouteMethodDefinition(
                nameNode.Text,
                parameterNames,
                routeTargets);
        }
    }

    private static void ProcessGlobalStatements(
        Node rootNode,
        Node fileRoot,
        string relativePath,
        string sourceProjectName,
        IReadOnlyDictionary<string, ProjectDescriptor> projectLookup,
        IReadOnlyDictionary<string, RouteMethodDefinition> routeMethods,
        Dictionary<string, AspireResourceDescriptor> resources,
        Dictionary<string, AspireTopologyLinkDescriptor> links,
        Dictionary<string, ResourceRef> resourceAliases,
        Dictionary<string, ResourceRef> endpointAliases)
    {
        foreach (var globalStatement in rootNode.NamedChildren
                     .Where(child => string.Equals(child.Type, "global_statement", StringComparison.Ordinal)))
        {
            foreach (var statement in globalStatement.NamedChildren)
            {
                ProcessStatement(
                    statement,
                    fileRoot,
                    relativePath,
                    sourceProjectName,
                    projectLookup,
                    routeMethods,
                    resources,
                    links,
                    resourceAliases,
                    endpointAliases);
            }
        }
    }

    private static void ProcessStatement(
        Node statement,
        Node fileRoot,
        string relativePath,
        string sourceProjectName,
        IReadOnlyDictionary<string, ProjectDescriptor> projectLookup,
        IReadOnlyDictionary<string, RouteMethodDefinition> routeMethods,
        Dictionary<string, AspireResourceDescriptor> resources,
        Dictionary<string, AspireTopologyLinkDescriptor> links,
        Dictionary<string, ResourceRef> resourceAliases,
        Dictionary<string, ResourceRef> endpointAliases)
    {
        switch (statement.Type)
        {
            case "local_declaration_statement":
                ProcessLocalDeclaration(
                    statement,
                    fileRoot,
                    relativePath,
                    sourceProjectName,
                    projectLookup,
                    routeMethods,
                    resources,
                    links,
                    resourceAliases,
                    endpointAliases);
                break;
            case "expression_statement":
                ProcessExpressionStatement(
                    statement,
                    fileRoot,
                    relativePath,
                    sourceProjectName,
                    projectLookup,
                    routeMethods,
                    resources,
                    links,
                    resourceAliases,
                    endpointAliases);
                break;
            case "if_statement":
                ProcessIfStatement(
                    statement,
                    fileRoot,
                    relativePath,
                    sourceProjectName,
                    projectLookup,
                    routeMethods,
                    resources,
                    links,
                    resourceAliases,
                    endpointAliases);
                break;
            case "block":
                foreach (var child in statement.NamedChildren)
                {
                    ProcessStatement(
                        child,
                        fileRoot,
                        relativePath,
                        sourceProjectName,
                        projectLookup,
                        routeMethods,
                        resources,
                        links,
                        resourceAliases,
                        endpointAliases);
                }
                break;
        }
    }

    private static void ProcessLocalDeclaration(
        Node statement,
        Node fileRoot,
        string relativePath,
        string sourceProjectName,
        IReadOnlyDictionary<string, ProjectDescriptor> projectLookup,
        IReadOnlyDictionary<string, RouteMethodDefinition> routeMethods,
        Dictionary<string, AspireResourceDescriptor> resources,
        Dictionary<string, AspireTopologyLinkDescriptor> links,
        Dictionary<string, ResourceRef> resourceAliases,
        Dictionary<string, ResourceRef> endpointAliases)
    {
        var declarationNode = statement.FirstNamedChildOfType("variable_declaration");
        if (declarationNode is null)
            return;

        foreach (var variableNode in declarationNode.NamedChildren
                     .Where(child => string.Equals(child.Type, "variable_declarator", StringComparison.Ordinal)))
        {
            var nameNode = variableNode.TryGetChildForField("name") ?? variableNode.FirstNamedChildOfType("identifier");
            var valueNode = variableNode.TryGetChildForField("value");
            if (valueNode is null)
            {
                var namedChildren = variableNode.NamedChildren.ToList();
                valueNode = namedChildren.Count > 1 ? namedChildren[1] : null;
            }
            if (nameNode is null || valueNode is null)
                continue;

            if (TryCreateResourceFromExpression(
                    valueNode,
                    relativePath,
                    sourceProjectName,
                    projectLookup,
                    resources,
                    out var createdResource))
            {
                resourceAliases[nameNode.Text] = createdResource;
                ProcessResourceChain(
                    createdResource,
                    valueNode,
                    fileRoot,
                    routeMethods,
                    links,
                    resourceAliases,
                    endpointAliases);
                continue;
            }

            if (TryResolveResourceReference(valueNode, resourceAliases, endpointAliases, out var targetResource))
            {
                endpointAliases[nameNode.Text] = targetResource;
            }
        }
    }

    private static void ProcessExpressionStatement(
        Node statement,
        Node fileRoot,
        string relativePath,
        string sourceProjectName,
        IReadOnlyDictionary<string, ProjectDescriptor> projectLookup,
        IReadOnlyDictionary<string, RouteMethodDefinition> routeMethods,
        Dictionary<string, AspireResourceDescriptor> resources,
        Dictionary<string, AspireTopologyLinkDescriptor> links,
        Dictionary<string, ResourceRef> resourceAliases,
        Dictionary<string, ResourceRef> endpointAliases)
    {
        var invocationNode = statement.FirstNamedChildOfType("invocation_expression");
        if (invocationNode is null)
            return;

        if (TryCreateResourceFromExpression(
                invocationNode,
                relativePath,
                sourceProjectName,
                projectLookup,
                resources,
                out var createdResource))
        {
            ProcessResourceChain(
                createdResource,
                invocationNode,
                fileRoot,
                routeMethods,
                links,
                resourceAliases,
                endpointAliases);
            return;
        }

        if (TryResolveSourceResource(invocationNode, resourceAliases, out var sourceResource))
        {
            ProcessResourceChain(
                sourceResource,
                invocationNode,
                fileRoot,
                routeMethods,
                links,
                resourceAliases,
                endpointAliases);
        }
    }

    private static void ProcessIfStatement(
        Node statement,
        Node fileRoot,
        string relativePath,
        string sourceProjectName,
        IReadOnlyDictionary<string, ProjectDescriptor> projectLookup,
        IReadOnlyDictionary<string, RouteMethodDefinition> routeMethods,
        Dictionary<string, AspireResourceDescriptor> resources,
        Dictionary<string, AspireTopologyLinkDescriptor> links,
        Dictionary<string, ResourceRef> resourceAliases,
        Dictionary<string, ResourceRef> endpointAliases)
    {
        var conditionNode = statement.TryGetChildForField("condition");
        var consequenceNode = statement.TryGetChildForField("consequence");
        var alternativeNode = statement.TryGetChildForField("alternative");

        var condition = conditionNode is null ? null : ResolveConstantBoolean(conditionNode, fileRoot);

        if (condition is true && consequenceNode is not null)
        {
            ProcessStatement(
                consequenceNode,
                fileRoot,
                relativePath,
                sourceProjectName,
                projectLookup,
                routeMethods,
                resources,
                links,
                resourceAliases,
                endpointAliases);
            return;
        }

        if (condition is false)
        {
            if (alternativeNode is not null)
            {
                ProcessStatement(
                    alternativeNode,
                    fileRoot,
                    relativePath,
                    sourceProjectName,
                    projectLookup,
                    routeMethods,
                    resources,
                    links,
                    resourceAliases,
                    endpointAliases);
            }

            return;
        }

        if (consequenceNode is not null)
        {
            ProcessStatement(
                consequenceNode,
                fileRoot,
                relativePath,
                sourceProjectName,
                projectLookup,
                routeMethods,
                resources,
                links,
                resourceAliases,
                endpointAliases);
        }

        if (alternativeNode is not null)
        {
            ProcessStatement(
                alternativeNode,
                fileRoot,
                relativePath,
                sourceProjectName,
                projectLookup,
                routeMethods,
                resources,
                links,
                resourceAliases,
                endpointAliases);
        }
    }

    private static bool TryCreateResourceFromExpression(
        Node expressionNode,
        string relativePath,
        string sourceProjectName,
        IReadOnlyDictionary<string, ProjectDescriptor> projectLookup,
        Dictionary<string, AspireResourceDescriptor> resources,
        out ResourceRef resource)
    {
        resource = null!;

        var createInvocation = expressionNode
            .DescendantsOfType("invocation_expression")
            .Select(node => CSharpAstHelpers.TryGetInvocation(node, out var invocation) ? invocation : null)
            .Where(invocation => invocation is not null)
            .OrderBy(invocation => invocation!.FunctionNode.StartIndex)
            .FirstOrDefault(invocation => invocation!.MethodName is
                "AddProject" or "AddYarp" or "AddRedis" or "AddRabbitMQ" or "AddDatabase" or "AddPostgres");

        if (createInvocation is null)
            return false;

        if (createInvocation.MethodName == "AddPostgres")
            return false;

        if (createInvocation.Arguments.Count == 0)
            return false;

        var rawName = createInvocation.Arguments[0].TryGetStringLiteralContent();
        if (string.IsNullOrWhiteSpace(rawName))
            return false;

        var resourceName = rawName.Trim();
        var resourceKind = MapResourceKind(createInvocation.MethodName);

        if (resourceKind == AspireResourceKind.Project)
        {
            var project = ResolveProject(resourceName, projectLookup);
            if (project is null || project.IsTestProject)
                return false;

            var canonicalId = $"csharp:{project.Name}";
            resources.TryAdd(canonicalId, new AspireResourceDescriptor(
                ResourceId: canonicalId,
                ResourceKind: resourceKind,
                Name: project.Name,
                SourceProjectName: sourceProjectName,
                SourceFile: relativePath,
                Confidence: Confidence.High,
                Properties: new Dictionary<string, string>
                {
                    ["resourceName"] = resourceName,
                    ["projectName"] = project.Name,
                }));

            resource = new ResourceRef(canonicalId, resourceKind, project.Name);
            return true;
        }

        var finalCanonicalId = $"csharp:{resourceName}";
        resources.TryAdd(finalCanonicalId, new AspireResourceDescriptor(
            ResourceId: finalCanonicalId,
            ResourceKind: resourceKind,
            Name: resourceName,
            SourceProjectName: sourceProjectName,
            SourceFile: relativePath,
            Confidence: Confidence.High,
            Properties: new Dictionary<string, string>
            {
                ["resourceName"] = resourceName,
            }));

        resource = new ResourceRef(finalCanonicalId, resourceKind, resourceName);
        return true;
    }

    private static void ProcessResourceChain(
        ResourceRef sourceResource,
        Node expressionNode,
        Node fileRoot,
        IReadOnlyDictionary<string, RouteMethodDefinition> routeMethods,
        Dictionary<string, AspireTopologyLinkDescriptor> links,
        IReadOnlyDictionary<string, ResourceRef> resourceAliases,
        IReadOnlyDictionary<string, ResourceRef> endpointAliases)
    {
        foreach (var invocationNode in expressionNode.DescendantsOfType("invocation_expression"))
        {
            if (!CSharpAstHelpers.TryGetInvocation(invocationNode, out var invocation))
                continue;

            switch (invocation.MethodName)
            {
                case "WithReference":
                    if (invocation.Arguments.Count > 0 &&
                        TryResolveResourceReference(invocation.Arguments[0], resourceAliases, endpointAliases, out var referenceTarget))
                    {
                        AddLinkForResolvedTarget(sourceResource, referenceTarget, "WithReference", links);
                    }
                    break;

                case "WithEnvironment":
                    if (invocation.Arguments.Count > 1 &&
                        TryResolveResourceReference(invocation.Arguments[1], resourceAliases, endpointAliases, out var environmentTarget))
                    {
                        AddLinkForResolvedTarget(sourceResource, environmentTarget, "WithEnvironment", links);
                    }
                    break;

                default:
                    if (routeMethods.TryGetValue(invocation.MethodName, out var routeMethod))
                    {
                        foreach (var routeTarget in ResolveRouteTargets(routeMethod, invocation, resourceAliases, endpointAliases))
                        {
                            AddLink(
                                sourceResource.ResourceId,
                                routeTarget.ResourceId,
                                AspireLinkKind.Calls,
                                $"Route:{routeMethod.Name}",
                                links);
                        }
                    }
                    break;
            }
        }
    }

    private static IEnumerable<ResourceRef> ResolveRouteTargets(
        RouteMethodDefinition routeMethod,
        CSharpInvocationInfo invocation,
        IReadOnlyDictionary<string, ResourceRef> resourceAliases,
        IReadOnlyDictionary<string, ResourceRef> endpointAliases)
    {
        var parameterMap = new Dictionary<string, ResourceRef>(StringComparer.Ordinal);
        var effectiveParameters = routeMethod.ParameterNames.Count > 0
            ? routeMethod.ParameterNames.Skip(1).ToList()
            : [];

        for (var i = 0; i < invocation.Arguments.Count && i < effectiveParameters.Count; i++)
        {
            if (TryResolveResourceReference(invocation.Arguments[i], resourceAliases, endpointAliases, out var resource))
            {
                parameterMap[effectiveParameters[i]] = resource;
            }
        }

        if (parameterMap.Count == 0)
            yield break;

        foreach (var routeTarget in routeMethod.RouteTargets)
        {
            if (parameterMap.TryGetValue(routeTarget.TargetParameterName, out var targetResource))
                yield return targetResource;
        }
    }

    private static IReadOnlyList<RouteTargetDescriptor> CollectRouteTargets(Node bodyNode, IReadOnlyList<string> parameterNames)
    {
        var targets = new List<RouteTargetDescriptor>();
        var localAliases = new Dictionary<string, string>(StringComparer.Ordinal);
        var effectiveParameters = parameterNames.Skip(1).ToHashSet(StringComparer.Ordinal);

        foreach (var node in bodyNode.DescendantsAndSelf().OrderBy(node => node.StartIndex))
        {
            if (node.Type == "variable_declarator")
            {
                var nameNode = node.TryGetChildForField("name") ?? node.FirstNamedChildOfType("identifier");
                var valueNode = node.TryGetChildForField("value");
                if (valueNode is null)
                {
                    var namedChildren = node.NamedChildren.ToList();
                    valueNode = namedChildren.Count > 1 ? namedChildren[1] : null;
                }
                if (nameNode is null || valueNode is null)
                    continue;

                if (!CSharpAstHelpers.TryGetInvocation(valueNode, out var valueInvocation))
                    continue;

                if (valueInvocation.MethodName != "AddCluster" || valueInvocation.Arguments.Count == 0)
                    continue;

                var clusterTargetIdentifier = CSharpAstHelpers.TryGetBaseIdentifier(valueInvocation.Arguments[0]);
                if (!string.IsNullOrWhiteSpace(clusterTargetIdentifier) && effectiveParameters.Contains(clusterTargetIdentifier))
                    localAliases[nameNode.Text] = clusterTargetIdentifier;

                continue;
            }

            if (!string.Equals(node.Type, "invocation_expression", StringComparison.Ordinal))
                continue;

            if (!CSharpAstHelpers.TryGetInvocation(node, out var routeInvocation))
                continue;

            if (routeInvocation.MethodName != "AddRoute" || routeInvocation.Arguments.Count < 2)
                continue;

            var targetIdentifier = CSharpAstHelpers.TryGetBaseIdentifier(routeInvocation.Arguments[1]);
            if (string.IsNullOrWhiteSpace(targetIdentifier))
                continue;

            if (localAliases.TryGetValue(targetIdentifier, out var aliasedParameter))
            {
                targets.Add(new RouteTargetDescriptor(aliasedParameter, $"Route:{routeInvocation.MethodName}"));
                continue;
            }

            if (effectiveParameters.Contains(targetIdentifier))
                targets.Add(new RouteTargetDescriptor(targetIdentifier, $"Route:{routeInvocation.MethodName}"));
        }

        return targets;
    }

    private static void AddLinkForResolvedTarget(
        ResourceRef sourceResource,
        ResourceRef targetResource,
        string label,
        Dictionary<string, AspireTopologyLinkDescriptor> links)
    {
        if (string.Equals(sourceResource.ResourceId, targetResource.ResourceId, StringComparison.OrdinalIgnoreCase))
            return;

        var linkKind = targetResource.Kind is AspireResourceKind.Project or AspireResourceKind.Gateway
            ? AspireLinkKind.Calls
            : AspireLinkKind.DependsOn;

        AddLink(sourceResource.ResourceId, targetResource.ResourceId, linkKind, label, links);
    }

    private static void AddLink(
        string sourceResourceId,
        string targetResourceId,
        AspireLinkKind kind,
        string label,
        Dictionary<string, AspireTopologyLinkDescriptor> links)
    {
        if (string.Equals(sourceResourceId, targetResourceId, StringComparison.OrdinalIgnoreCase))
            return;

        var key = $"{sourceResourceId}|{kind}|{targetResourceId}|{label}";
        links.TryAdd(key, new AspireTopologyLinkDescriptor(
            SourceResourceId: sourceResourceId,
            TargetResourceId: targetResourceId,
            LinkKind: kind,
            EvidenceLabel: label,
            Confidence: Confidence.High));
    }

    private static bool TryResolveSourceResource(
        Node expressionNode,
        IReadOnlyDictionary<string, ResourceRef> resourceAliases,
        out ResourceRef resource)
    {
        resource = null!;
        var baseIdentifier = CSharpAstHelpers.TryGetBaseIdentifier(expressionNode);
        return !string.IsNullOrWhiteSpace(baseIdentifier) &&
               resourceAliases.TryGetValue(baseIdentifier, out resource!);
    }

    private static bool TryResolveResourceReference(
        Node expressionNode,
        IReadOnlyDictionary<string, ResourceRef> resourceAliases,
        IReadOnlyDictionary<string, ResourceRef> endpointAliases,
        out ResourceRef resource)
    {
        return TryResolveResourceReference(expressionNode, resourceAliases, endpointAliases, endpointAliases, out resource);
    }

    private static bool TryResolveResourceReference(
        Node expressionNode,
        IReadOnlyDictionary<string, ResourceRef> primaryAliases,
        IReadOnlyDictionary<string, ResourceRef> secondaryAliases,
        IReadOnlyDictionary<string, ResourceRef> tertiaryAliases,
        out ResourceRef resource)
    {
        resource = null!;

        var identifier = CSharpAstHelpers.TryGetBaseIdentifier(expressionNode);
        if (string.IsNullOrWhiteSpace(identifier))
            return false;

        if (primaryAliases.TryGetValue(identifier, out var primary))
        {
            resource = primary;
            return true;
        }

        if (secondaryAliases.TryGetValue(identifier, out var secondary))
        {
            resource = secondary;
            return true;
        }

        if (tertiaryAliases.TryGetValue(identifier, out var tertiary))
        {
            resource = tertiary;
            return true;
        }

        return false;
    }

    private static ProjectDescriptor? ResolveProject(
        string resourceName,
        IReadOnlyDictionary<string, ProjectDescriptor> projectLookup)
    {
        var normalized = Normalize(resourceName);
        return string.IsNullOrWhiteSpace(normalized) ? null : projectLookup.GetValueOrDefault(normalized);
    }

    private static AspireResourceKind MapResourceKind(string methodName) =>
        methodName switch
        {
            "AddProject" => AspireResourceKind.Project,
            "AddYarp" => AspireResourceKind.Gateway,
            "AddRedis" => AspireResourceKind.Cache,
            "AddRabbitMQ" => AspireResourceKind.Broker,
            "AddDatabase" => AspireResourceKind.Database,
            _ => throw new InvalidOperationException($"Unsupported AppHost resource method '{methodName}'."),
        };

    private static bool IsExcludedPath(string filePath, string rootPath)
    {
        var relative = Path.GetRelativePath(rootPath, filePath).Replace('\\', '/');
        return relative.Contains("/bin/") || relative.Contains("/obj/") ||
               relative.StartsWith("bin/") || relative.StartsWith("obj/");
    }

    private static string Normalize(string value)
    {
        Span<char> buffer = stackalloc char[value.Length];
        var index = 0;

        foreach (var ch in value)
        {
            if (char.IsLetterOrDigit(ch))
                buffer[index++] = char.ToLowerInvariant(ch);
        }

        return new string(buffer[..index]);
    }
}
