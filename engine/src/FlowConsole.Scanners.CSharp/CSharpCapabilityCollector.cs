using FlowConsole.Core.Evidence;
using FlowConsole.Scanners.CodeParsing.TreeSitterSupport;
using TreeSitter;

namespace FlowConsole.Scanners.CSharp;

public static class CSharpCapabilityCollector
{
    private const string SourceAdapter = "csharp-capability";
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
            switch (node.Type)
            {
                case "attribute":
                    CollectAttributeEvidence(node, filePath, subject, evidence);
                    break;

                case "class_declaration":
                    CollectBaseClassEvidence(node, filePath, subject, evidence);
                    break;

                case "invocation_expression":
                    CollectInvocationCapabilityEvidence(node, filePath, subject, evidence);
                    break;
            }
        }
    }

    private static void CollectAttributeEvidence(
        Node node, string filePath, string subject,
        List<EvidenceRecord> evidence)
    {
        var nameNode = node.Children.FirstOrDefault(c => c.Type == "identifier" || c.Type == "qualified_name");
        if (nameNode == null) return;

        var attrName = nameNode.Text.Replace("Attribute", "");
        if (attrName == "ApiController")
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.Capability,
                EvidenceValue: "Capability:HttpApi",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 40));
        }
    }

    private static void CollectBaseClassEvidence(
        Node node, string filePath, string subject,
        List<EvidenceRecord> evidence)
    {
        // Look for base_list in class declaration
        var baseList = node.Children.FirstOrDefault(c => c.Type == "base_list");
        if (baseList == null) return;

        var baseTypes = baseList.NamedChildren
            .Select(CSharpAstHelpers.TryGetSimpleName)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .ToHashSet(StringComparer.Ordinal);

        if (baseTypes.Contains("ControllerBase") || baseTypes.Contains("Controller"))
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.Capability,
                EvidenceValue: "Capability:HttpApi",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 35));
        }

        if (baseTypes.Contains("BackgroundService"))
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.Capability,
                EvidenceValue: "Capability:BackgroundWorker",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 40));
        }

        if (baseTypes.Contains("IHostedService"))
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.Capability,
                EvidenceValue: "Capability:BackgroundWorker",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 35));
        }
    }

    private static void CollectInvocationCapabilityEvidence(
        Node node, string filePath, string subject,
        List<EvidenceRecord> evidence)
    {
        if (!CSharpAstHelpers.TryGetInvocation(node, out var invocation))
            return;

        if (IsHttpCapabilityMethod(invocation.MethodName))
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.Capability,
                EvidenceValue: "Capability:HttpApi",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 35));
        }

        if (invocation.MethodName is "MapGrpcService" or "AddGrpc")
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.Capability,
                EvidenceValue: "Capability:GrpcService",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 40));
        }

        if (invocation.MethodName == "AddSubscription")
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.Capability,
                EvidenceValue: "Capability:MessageConsumer",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 30));
        }
    }

    private static bool IsHttpCapabilityMethod(string methodName)
    {
        if (methodName is "MapControllers" or "MapGet" or "MapPost" or "MapPut" or
            "MapDelete" or "MapPatch" or "MapDefaultControllerRoute" or "MapControllerRoute" or
            "AddControllersWithViews" or "MapRazorComponents" or "MapForwarder")
        {
            return true;
        }

        return methodName.StartsWith("Map", StringComparison.Ordinal) &&
               (methodName.EndsWith("Api", StringComparison.Ordinal) ||
                methodName.Contains("ApiV", StringComparison.Ordinal));
    }
}
