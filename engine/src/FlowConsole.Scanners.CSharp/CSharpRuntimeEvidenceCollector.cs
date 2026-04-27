using FlowConsole.Core.Evidence;
using FlowConsole.Scanners.CodeParsing.TreeSitterSupport;
using TreeSitter;

namespace FlowConsole.Scanners.CSharp;

public static class CSharpRuntimeEvidenceCollector
{
    private const string SourceAdapter = "csharp-runtime";
    private const int MaxFileSizeBytes = 1_048_576; // 1 MB

    public static IReadOnlyList<EvidenceRecord> Collect(string projectDir, ProjectDescriptor project)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(projectDir);
        ArgumentNullException.ThrowIfNull(project);

        if (!Directory.Exists(projectDir))
            return [];

        var evidence = new List<EvidenceRecord>();
        var csFiles = Directory.EnumerateFiles(projectDir, "*.cs", SearchOption.AllDirectories)
            .Where(f => !IsExcludedPath(f, projectDir));

        using var language = new Language("c-sharp");

        foreach (var filePath in csFiles)
        {
            var fi = new FileInfo(filePath);
            if (fi.Length > MaxFileSizeBytes) continue; //TODO log skipped files

            var content = File.ReadAllText(filePath);
            var relativePath = Path.GetRelativePath(projectDir, filePath).Replace('\\', '/');

            using var parser = new Parser(language);
            using var tree = parser.Parse(content);
            if (tree == null) continue;

            CollectFromTree(tree.RootNode, content, relativePath, project.Name, evidence);
        }

        return evidence;
    }

    private static void CollectFromTree(
        Node root, string source, string filePath, string subject,
        List<EvidenceRecord> evidence)
    {
        foreach (var node in root.DescendantsAndSelf())
        {
            if (node.Type == "invocation_expression")
            {
                CollectInvocationEvidence(node, filePath, subject, evidence);
            }
            else if (node.Type is "object_creation_expression" or "implicit_object_creation_expression")
            {
                CollectObjectCreationEvidence(node, filePath, subject, evidence);
            }
            else if (node.Type == "method_declaration")
            {
                CollectEntrypointEvidence(node, filePath, subject, evidence);
            }
        }

        // Check for top-level statements (global_statement nodes indicate top-level code)
        var hasGlobalStatements = root.Children.Any(c => c.Type == "global_statement");
        if (hasGlobalStatements)
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.RuntimeCandidate,
                EvidenceValue: "RuntimeCandidate:Entrypoint",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 10));
        }
    }

    private static void CollectInvocationEvidence(
        Node node, string filePath, string subject,
        List<EvidenceRecord> evidence)
    {
        if (!CSharpAstHelpers.TryGetInvocation(node, out var invocation))
            return;

        // WebApplication.CreateBuilder / WebApplicationBuilder
        if (invocation.MethodName == "CreateBuilder" &&
            invocation.NameChain.Count >= 2 &&
            invocation.NameChain[^2] == "WebApplication")
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.RuntimeCandidate,
                EvidenceValue: "RuntimeCandidate:WebApplication",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 50));
        }

        // Host.CreateApplicationBuilder / Host.CreateDefaultBuilder
        if (invocation.NameChain.Count >= 2 &&
            invocation.NameChain[^2] == "Host" &&
            invocation.MethodName is "CreateApplicationBuilder" or "CreateDefaultBuilder")
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.RuntimeCandidate,
                EvidenceValue: "RuntimeCandidate:Worker",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 30));
        }

        // AddHostedService
        if (invocation.MethodName == "AddHostedService")
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.RuntimeCandidate,
                EvidenceValue: "RuntimeCandidate:Worker",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 20));
        }

        if (invocation.MethodName == "CreateBuilder" &&
            invocation.NameChain.Count >= 2 &&
            invocation.NameChain[^2] == "MauiApp")
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.RuntimeCandidate,
                EvidenceValue: "RuntimeCandidate:Entrypoint",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 25));
        }

        if (invocation.MethodName == "UseMauiApp" ||
            (invocation.MethodName.StartsWith("UseMaui", StringComparison.Ordinal) &&
             invocation.MethodName != "UseMauiApp"))
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.RuntimeCandidate,
                EvidenceValue: "RuntimeCandidate:Entrypoint",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 20));
        }

        if (invocation.MethodName == "AddMauiBlazorWebView")
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.RuntimeCandidate,
                EvidenceValue: "RuntimeCandidate:Entrypoint",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 10));
        }

        // MapControllers / MapGet / MapPost -> Capability:HttpApi
        if (IsHttpCapabilityMethod(invocation.MethodName))
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.Capability,
                EvidenceValue: "Capability:HttpApi",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 30));
        }

        // MapGrpcService -> Capability:GrpcService
        if (invocation.MethodName == "MapGrpcService")
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.Capability,
                EvidenceValue: "Capability:GrpcService",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 30));
        }
    }

    private static void CollectEntrypointEvidence(
        Node node, string filePath, string subject,
        List<EvidenceRecord> evidence)
    {
        // Look for Main method
        var nameNode = node.TryGetChildForField("name") ?? node.FirstNamedChildOfType("identifier");
        if (nameNode?.Text == "Main")
        {
            // Check it's static
            var allModifiers = node.Children.Where(c => c.Type == "modifier").Select(c => c.Text);
            if (allModifiers.Any(m => m == "static"))
            {
                evidence.Add(new EvidenceRecord(
                    Subject: subject,
                    EvidenceKind: EvidenceKind.RuntimeCandidate,
                    EvidenceValue: "RuntimeCandidate:Entrypoint",
                    Location: filePath,
                    OriginFile: filePath,
                    SourceAdapter: SourceAdapter,
                WeightHint: 10));
            }
        }

        if (nameNode?.Text == "CreateMauiApp")
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.RuntimeCandidate,
                EvidenceValue: "RuntimeCandidate:Entrypoint",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 15));
        }
    }

    private static void CollectObjectCreationEvidence(
        Node node,
        string filePath,
        string subject,
        List<EvidenceRecord> evidence)
    {
        if (!CSharpAstHelpers.TryGetObjectCreation(node, out var creation))
            return;

        if (creation.TypeName == "WebApplicationBuilder")
        {
            evidence.Add(new EvidenceRecord(
                Subject: subject,
                EvidenceKind: EvidenceKind.RuntimeCandidate,
                EvidenceValue: "RuntimeCandidate:WebApplication",
                Location: filePath,
                OriginFile: filePath,
                SourceAdapter: SourceAdapter,
                WeightHint: 50));
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

    private static bool IsExcludedPath(string filePath, string projectDir)
    {
        var relative = Path.GetRelativePath(projectDir, filePath).Replace('\\', '/');
        return relative.Contains("/bin/") || relative.Contains("/obj/") ||
               relative.StartsWith("bin/") || relative.StartsWith("obj/") ||
               relative.Contains("/.git/") || relative.StartsWith(".git/");
    }
}
