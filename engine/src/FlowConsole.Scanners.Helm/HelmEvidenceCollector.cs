using FlowConsole.Core.Evidence;
using YamlDotNet.RepresentationModel;

namespace FlowConsole.Scanners.Helm;

/// <summary>
/// Extracts evidence records from a Helm chart directory by parsing Chart.yaml
/// and templates/ using YamlDotNet. Produces ChartMetadata, ChartDependency,
/// KubernetesResource, and Exposure evidence.
/// </summary>
public static class HelmEvidenceCollector
{
    private const string SourceAdapter = "helm-evidence";

    public static IReadOnlyList<EvidenceRecord> Collect(string chartDir)
    {
        ArgumentException.ThrowIfNullOrEmpty(chartDir);
        if (!Directory.Exists(chartDir))
            throw new ArgumentException($"Helm chart directory not found: '{chartDir}'.");

        var evidence = new List<EvidenceRecord>();

        var chartYamlPath = Path.Combine(chartDir, "Chart.yaml");
        if (File.Exists(chartYamlPath))
        {
            CollectChartMetadata(chartYamlPath, evidence);
        }

        var templatesDir = Path.Combine(chartDir, "templates");
        if (Directory.Exists(templatesDir))
        {
            CollectTemplateResources(templatesDir, evidence);
        }

        return evidence;
    }

    private static void CollectChartMetadata(string chartYamlPath, List<EvidenceRecord> evidence)
    {
        string content;
        try
        {
            content = File.ReadAllText(chartYamlPath);
        }
        catch (IOException)
        {
            return;
        }

        var yaml = new YamlStream();
        try
        {
            yaml.Load(new StringReader(content));
        }
        catch (YamlDotNet.Core.YamlException)
        {
            return;
        }

        if (yaml.Documents.Count == 0)
            return;

        var root = yaml.Documents[0].RootNode as YamlMappingNode;
        if (root is null)
            return;

        var chartName = GetScalarValue(root, "name") ?? Path.GetFileName(Path.GetDirectoryName(chartYamlPath)!);
        var chartVersion = GetScalarValue(root, "version") ?? "unknown";
        var chartDescription = GetScalarValue(root, "description") ?? string.Empty;
        var chartAppVersion = GetScalarValue(root, "appVersion");

        // Emit chart metadata evidence
        evidence.Add(new EvidenceRecord(
            Subject: chartName,
            EvidenceKind: EvidenceKind.ChartMetadata,
            EvidenceValue: $"name:{chartName}",
            Location: null,
            OriginFile: chartYamlPath,
            SourceAdapter: SourceAdapter,
            WeightHint: null));

        evidence.Add(new EvidenceRecord(
            Subject: chartName,
            EvidenceKind: EvidenceKind.ChartMetadata,
            EvidenceValue: $"version:{chartVersion}",
            Location: null,
            OriginFile: chartYamlPath,
            SourceAdapter: SourceAdapter,
            WeightHint: null));

        if (!string.IsNullOrEmpty(chartDescription))
        {
            evidence.Add(new EvidenceRecord(
                Subject: chartName,
                EvidenceKind: EvidenceKind.ChartMetadata,
                EvidenceValue: $"description:{chartDescription}",
                Location: null,
                OriginFile: chartYamlPath,
                SourceAdapter: SourceAdapter,
                WeightHint: null));
        }

        if (!string.IsNullOrEmpty(chartAppVersion))
        {
            evidence.Add(new EvidenceRecord(
                Subject: chartName,
                EvidenceKind: EvidenceKind.ChartMetadata,
                EvidenceValue: $"appVersion:{chartAppVersion}",
                Location: null,
                OriginFile: chartYamlPath,
                SourceAdapter: SourceAdapter,
                WeightHint: null));
        }

        // Emit chart dependency evidence
        if (root.Children.TryGetValue(new YamlScalarNode("dependencies"), out var depsNode)
            && depsNode is YamlSequenceNode depsSeq)
        {
            foreach (var depNode in depsSeq.Children)
            {
                if (depNode is not YamlMappingNode depMap)
                    continue;

                var depName = GetScalarValue(depMap, "name");
                if (string.IsNullOrEmpty(depName))
                    continue;

                var depVersion = GetScalarValue(depMap, "version") ?? "unknown";
                var depRepository = GetScalarValue(depMap, "repository") ?? string.Empty;

                evidence.Add(new EvidenceRecord(
                    Subject: chartName,
                    EvidenceKind: EvidenceKind.ChartDependency,
                    EvidenceValue: $"dependency:{depName}:{depVersion}",
                    Location: !string.IsNullOrEmpty(depRepository) ? depRepository : null,
                    OriginFile: chartYamlPath,
                    SourceAdapter: SourceAdapter,
                    WeightHint: null));
            }
        }
    }

    private static void CollectTemplateResources(string templatesDir, List<EvidenceRecord> evidence)
    {
        var yamlFiles = Directory.GetFiles(templatesDir, "*.yaml", SearchOption.AllDirectories)
            .Concat(Directory.GetFiles(templatesDir, "*.yml", SearchOption.AllDirectories));

        foreach (var templateFile in yamlFiles)
        {
            try
            {
                CollectFromTemplateFile(templateFile, evidence);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Skip unreadable or invalid template files
            }
        }
    }

    private static void CollectFromTemplateFile(string templateFile, List<EvidenceRecord> evidence)
    {
        var content = File.ReadAllText(templateFile);

        // Handle multi-document YAML by splitting on ---
        var documents = content.Split(["---"], StringSplitOptions.RemoveEmptyEntries);

        foreach (var doc in documents)
        {
            var trimmedDoc = doc.Trim();
            if (string.IsNullOrWhiteSpace(trimmedDoc))
                continue;

            // Skip documents that are mostly Go template directives
            if (trimmedDoc.StartsWith("{{", StringComparison.Ordinal))
                continue;

            YamlStream yaml;
            try
            {
                yaml = new YamlStream();
                yaml.Load(new StringReader(trimmedDoc));
            }
            catch (YamlDotNet.Core.YamlException)
            {
                continue;
            }

            if (yaml.Documents.Count == 0)
                continue;

            var root = yaml.Documents[0].RootNode as YamlMappingNode;
            if (root is null)
                continue;

            var kind = GetScalarValue(root, "kind");
            if (string.IsNullOrEmpty(kind))
                continue;

            var metadataNode = GetMappingChild(root, "metadata");
            var name = metadataNode is not null ? GetScalarValue(metadataNode, "name") : null;
            var ns = metadataNode is not null ? GetScalarValue(metadataNode, "namespace") : null;

            // Extract labels and selectors
            var labels = ExtractMapValues(metadataNode, "labels");
            var selectorLabels = ExtractSelectorLabels(root);

            // Normalize name - handle Go template expressions
            if (string.IsNullOrEmpty(name) || name.Contains("{{"))
                name = $"unnamed-{kind.ToLowerInvariant()}";

            // Build identity string: kind:name[:namespace]
            var identity = ns is not null
                ? $"{kind}:{name}:{ns}"
                : $"{kind}:{name}";

            // Emit KubernetesResource evidence
            var resourceValue = $"resource:{identity}";
            if (labels.Count > 0)
            {
                var labelStr = string.Join(",", labels.Select(kv => $"{kv.Key}={kv.Value}"));
                resourceValue += $"|labels:{labelStr}";
            }

            if (selectorLabels.Count > 0)
            {
                var selectorStr = string.Join(",", selectorLabels.Select(kv => $"{kv.Key}={kv.Value}"));
                resourceValue += $"|selectors:{selectorStr}";
            }

            evidence.Add(new EvidenceRecord(
                Subject: name,
                EvidenceKind: EvidenceKind.KubernetesResource,
                EvidenceValue: resourceValue,
                Location: ns,
                OriginFile: templateFile,
                SourceAdapter: SourceAdapter,
                WeightHint: null));

            // Emit Exposure evidence for Service and Ingress
            if (kind is "Service" or "Ingress")
            {
                EmitExposureEvidence(root, kind, name, ns, templateFile, evidence);
            }
        }
    }

    private static void EmitExposureEvidence(
        YamlMappingNode root,
        string kind,
        string name,
        string? ns,
        string templateFile,
        List<EvidenceRecord> evidence)
    {
        var specNode = GetMappingChild(root, "spec");
        if (specNode is null)
            return;

        if (kind == "Service")
        {
            var serviceType = GetScalarValue(specNode, "type") ?? "ClusterIP";
            var ports = GetSequenceChild(specNode, "ports");
            var portStr = string.Empty;

            if (ports is not null)
            {
                var portValues = new List<string>();
                foreach (var portNode in ports.Children)
                {
                    if (portNode is YamlMappingNode portMap)
                    {
                        var port = GetScalarValue(portMap, "port");
                        if (!string.IsNullOrEmpty(port))
                            portValues.Add(port);
                    }
                }

                if (portValues.Count > 0)
                    portStr = $"|ports:{string.Join(",", portValues)}";
            }

            evidence.Add(new EvidenceRecord(
                Subject: name,
                EvidenceKind: EvidenceKind.Exposure,
                EvidenceValue: $"service:{serviceType}{portStr}",
                Location: ns,
                OriginFile: templateFile,
                SourceAdapter: SourceAdapter,
                WeightHint: null));
        }
        else if (kind == "Ingress")
        {
            var rules = GetSequenceChild(specNode, "rules");
            if (rules is not null)
            {
                foreach (var ruleNode in rules.Children)
                {
                    if (ruleNode is YamlMappingNode ruleMap)
                    {
                        var host = GetScalarValue(ruleMap, "host");
                        if (!string.IsNullOrEmpty(host) && !host.Contains("{{"))
                        {
                            evidence.Add(new EvidenceRecord(
                                Subject: name,
                                EvidenceKind: EvidenceKind.Exposure,
                                EvidenceValue: $"ingress:{host}",
                                Location: ns,
                                OriginFile: templateFile,
                                SourceAdapter: SourceAdapter,
                                WeightHint: null));
                        }
                    }
                }
            }

            // If no rules with concrete hosts, emit a generic ingress exposure
            if (rules is null || !evidence.Any(e =>
                e.Subject == name && e.EvidenceKind == EvidenceKind.Exposure
                && e.EvidenceValue.StartsWith("ingress:", StringComparison.Ordinal)))
            {
                evidence.Add(new EvidenceRecord(
                    Subject: name,
                    EvidenceKind: EvidenceKind.Exposure,
                    EvidenceValue: "ingress:external",
                    Location: ns,
                    OriginFile: templateFile,
                    SourceAdapter: SourceAdapter,
                    WeightHint: null));
            }
        }
    }

    private static string? GetScalarValue(YamlMappingNode node, string key)
    {
        if (node.Children.TryGetValue(new YamlScalarNode(key), out var value)
            && value is YamlScalarNode scalar)
        {
            return scalar.Value;
        }

        return null;
    }

    private static YamlMappingNode? GetMappingChild(YamlMappingNode node, string key)
    {
        if (node.Children.TryGetValue(new YamlScalarNode(key), out var value)
            && value is YamlMappingNode mapping)
        {
            return mapping;
        }

        return null;
    }

    private static YamlSequenceNode? GetSequenceChild(YamlMappingNode node, string key)
    {
        if (node.Children.TryGetValue(new YamlScalarNode(key), out var value)
            && value is YamlSequenceNode seq)
        {
            return seq;
        }

        return null;
    }

    private static Dictionary<string, string> ExtractMapValues(YamlMappingNode? parent, string key)
    {
        var result = new Dictionary<string, string>();
        if (parent is null)
            return result;

        var mapNode = GetMappingChild(parent, key);
        if (mapNode is null)
            return result;

        foreach (var entry in mapNode.Children)
        {
            if (entry.Key is YamlScalarNode keyScalar && entry.Value is YamlScalarNode valScalar
                && keyScalar.Value is not null && valScalar.Value is not null
                && !valScalar.Value.Contains("{{"))
            {
                result[keyScalar.Value] = valScalar.Value;
            }
        }

        return result;
    }

    private static Dictionary<string, string> ExtractSelectorLabels(YamlMappingNode root)
    {
        // Look for spec.selector.matchLabels
        var specNode = GetMappingChild(root, "spec");
        if (specNode is null)
            return new Dictionary<string, string>();

        var selectorNode = GetMappingChild(specNode, "selector");
        if (selectorNode is null)
            return new Dictionary<string, string>();

        var matchLabelsNode = GetMappingChild(selectorNode, "matchLabels");
        if (matchLabelsNode is null)
            return new Dictionary<string, string>();

        var result = new Dictionary<string, string>();
        foreach (var entry in matchLabelsNode.Children)
        {
            if (entry.Key is YamlScalarNode keyScalar && entry.Value is YamlScalarNode valScalar
                && keyScalar.Value is not null && valScalar.Value is not null
                && !valScalar.Value.Contains("{{"))
            {
                result[keyScalar.Value] = valScalar.Value;
            }
        }

        return result;
    }
}
