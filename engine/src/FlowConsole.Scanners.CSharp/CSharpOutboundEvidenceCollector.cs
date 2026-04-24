using FlowConsole.Core.Evidence;
using FlowConsole.Scanners.CodeParsing.TreeSitterSupport;
using TreeSitter;

namespace FlowConsole.Scanners.CSharp;

public static class CSharpOutboundEvidenceCollector
{
    private const string SourceAdapter = "csharp-outbound";
    private const int MaxFileSizeBytes = 1_048_576;

    public static IReadOnlyList<EvidenceRecord> Collect(
        string projectDir, IReadOnlyList<string> projectFiles)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(projectDir);
        ArgumentNullException.ThrowIfNull(projectFiles);

        var evidence = new List<EvidenceRecord>();
        var projectName = Path.GetFileName(projectDir);

        using var language = new Language("c-sharp");

        foreach (var filePath in projectFiles)
        {
            var fi = new FileInfo(filePath);
            if (!fi.Exists || fi.Length > MaxFileSizeBytes) continue;

            var content = File.ReadAllText(filePath);
            var relativePath = Path.GetRelativePath(projectDir, filePath).Replace('\\', '/');

            using var parser = new Parser(language);
            using var tree = parser.Parse(content);
            if (tree == null) continue;

            CollectFromTree(tree.RootNode, relativePath, projectName, evidence);
        }

        return evidence;
    }

    private static void CollectFromTree(
        Node root, string filePath, string subject,
        List<EvidenceRecord> evidence)
    {
        foreach (var node in root.DescendantsAndSelf())
        {
            if (node.Type == "invocation_expression")
                CollectInvocationEvidence(node, root, filePath, subject, evidence);
            else if (node.Type == "object_creation_expression")
                CollectObjectCreationEvidence(node, root, filePath, subject, evidence);
        }
    }

    private static void CollectInvocationEvidence(
        Node node,
        Node fileRoot,
        string filePath,
        string subject,
        List<EvidenceRecord> evidence)
    {
        if (!CSharpAstHelpers.TryGetInvocation(node, out var invocation))
            return;

        if (invocation.MethodName == "AddHttpClient")
        {
            AddOutboundEvidence(subject, filePath, "Outbound:HttpClient", evidence, weightHint: 30);
            var target = TryResolveClientTarget(invocation, fileRoot, "BaseAddress");
            AddTargetOutboundEvidence(subject, filePath, "HttpClient", target, evidence, weightHint: 30);
            return;
        }

        if (invocation.MethodName == "AddGrpcClient")
        {
            AddOutboundEvidence(subject, filePath, "Outbound:GrpcClient", evidence, weightHint: 30);
            var target = TryResolveClientTarget(invocation, fileRoot, "Address", "BaseAddress");
            AddTargetOutboundEvidence(subject, filePath, "GrpcClient", target, evidence, weightHint: 30);
            return;
        }

        if (invocation.MethodName == "ForAddress" &&
            invocation.NameChain.Count >= 2 &&
            invocation.NameChain[^2] == "GrpcChannel")
        {
            AddOutboundEvidence(subject, filePath, "Outbound:GrpcClient", evidence, weightHint: 30);
            var target = invocation.Arguments.Count > 0
                ? CSharpAstHelpers.TryResolveValueToken(invocation.Arguments[0], fileRoot)
                : null;
            AddTargetOutboundEvidence(subject, filePath, "GrpcClient", target, evidence, weightHint: 30);
            return;
        }

        if (invocation.MethodName == "MapForwarder")
        {
            foreach (var argument in invocation.Arguments)
            {
                var target = CSharpAstHelpers.TryResolveValueToken(argument, fileRoot);
                if (!string.IsNullOrWhiteSpace(target) && IsServiceDiscoveryOrUrlLiteral(target))
                {
                    AddTargetOutboundEvidence(subject, filePath, "HttpClient", target, evidence, weightHint: 30);
                    break;
                }
            }

            return;
        }

        if (invocation.MethodName == "AddOpenIdConnect")
        {
            var target = TryResolveClientTarget(invocation, fileRoot, "Authority");
            AddTargetOutboundEvidence(subject, filePath, "AuthProvider", target, evidence, weightHint: 30);
            return;
        }

        if (CSharpAstHelpers.IsWrapperHttpInvocation(invocation))
        {
            AddOutboundEvidence(subject, filePath, "Outbound:HttpClient", evidence, weightHint: 20);
            var target = invocation.Arguments.Count > 0
                ? CSharpAstHelpers.TryResolveValueToken(invocation.Arguments[0], fileRoot)
                : null;
            AddTargetOutboundEvidence(subject, filePath, "HttpClient", target, evidence, weightHint: 20);
            return;
        }

        if (invocation.MethodName == "AddRabbitMqEventBus")
        {
            var target = invocation.Arguments.Count > 0
                ? CSharpAstHelpers.TryResolveValueToken(invocation.Arguments[0], fileRoot)
                : null;
            AddTargetOutboundEvidence(subject, filePath, "MessageBus", target, evidence, weightHint: 25);
            return;
        }

        if (CSharpAstHelpers.IsPublishOrSendInvocation(invocation))
        {
            AddOutboundEvidence(subject, filePath, "Outbound:MessageBus", evidence, weightHint: 20);
        }
    }

    private static void CollectObjectCreationEvidence(
        Node node,
        Node fileRoot,
        string filePath,
        string subject,
        List<EvidenceRecord> evidence)
    {
        if (!CSharpAstHelpers.TryGetObjectCreation(node, out var creation))
            return;

        if (!string.Equals(creation.TypeName, "OidcClientOptions", StringComparison.Ordinal))
            return;

        var authorityAssignment = creation.InitializerAssignments
            .FirstOrDefault(assignment => assignment.TargetName == "Authority");

        if (authorityAssignment is null)
            return;

        var target = CSharpAstHelpers.TryResolveValueToken(authorityAssignment.ValueNode, fileRoot);
        AddTargetOutboundEvidence(subject, filePath, "AuthProvider", target, evidence, weightHint: 30);
    }

    private static string? TryResolveClientTarget(
        CSharpInvocationInfo invocation,
        Node fileRoot,
        params string[] propertyNames)
    {
        foreach (var argument in invocation.Arguments)
        {
            if (argument.Type != "lambda_expression")
                continue;

            var bodyNode = argument.TryGetChildForField("body") ??
                           argument.NamedChildren.LastOrDefault();
            if (bodyNode is null)
                continue;

            var assignments = CSharpAstHelpers.CollectAssignments(bodyNode)
                .Where(assignment => propertyNames.Contains(assignment.TargetName, StringComparer.Ordinal))
                .ToList();

            foreach (var assignment in assignments)
            {
                var target = CSharpAstHelpers.TryResolveValueToken(assignment.ValueNode, fileRoot);
                if (!string.IsNullOrWhiteSpace(target))
                    return target;
            }
        }

        return null;
    }

    private static void AddOutboundEvidence(
        string subject,
        string filePath,
        string evidenceValue,
        List<EvidenceRecord> evidence,
        int weightHint)
    {
        if (evidence.Any(record =>
                record.Subject == subject &&
                record.EvidenceKind == EvidenceKind.OutboundCommunication &&
                string.Equals(record.EvidenceValue, evidenceValue, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(record.Location, filePath, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        evidence.Add(new EvidenceRecord(
            Subject: subject,
            EvidenceKind: EvidenceKind.OutboundCommunication,
            EvidenceValue: evidenceValue,
            Location: filePath,
            OriginFile: filePath,
            SourceAdapter: SourceAdapter,
            WeightHint: weightHint));
    }

    private static void AddTargetOutboundEvidence(
        string subject,
        string filePath,
        string outboundKind,
        string? rawTarget,
        List<EvidenceRecord> evidence,
        int weightHint)
    {
        var target = NormalizeTargetToken(rawTarget);
        if (string.IsNullOrWhiteSpace(target))
            return;

        AddOutboundEvidence(
            subject,
            filePath,
            $"Outbound:{outboundKind}:{target}",
            evidence,
            weightHint);
    }

    private static string? NormalizeTargetToken(string? rawTarget)
    {
        if (string.IsNullOrWhiteSpace(rawTarget))
            return null;

        return IsServiceDiscoveryOrUrlLiteral(rawTarget)
            ? ExtractHostToken(rawTarget)
            : rawTarget.Trim();
    }

    private static bool IsServiceDiscoveryOrUrlLiteral(string value)
    {
        return value.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
               value.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
               value.StartsWith("grpc://", StringComparison.OrdinalIgnoreCase) ||
               value.StartsWith("https+http://", StringComparison.OrdinalIgnoreCase) ||
               value.StartsWith("http+https://", StringComparison.OrdinalIgnoreCase);
    }

    private static string ExtractHostToken(string value)
    {
        var target = value;
        var schemeIndex = target.IndexOf("://", StringComparison.Ordinal);
        if (schemeIndex >= 0)
            target = target[(schemeIndex + 3)..];

        var slashIndex = target.IndexOf('/');
        if (slashIndex >= 0)
            target = target[..slashIndex];

        var colonIndex = target.IndexOf(':');
        if (colonIndex >= 0)
            target = target[..colonIndex];

        return target.Trim();
    }
}
