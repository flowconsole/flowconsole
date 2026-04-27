using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Entities.Elements.Arch;
using FlowConsole.Core.Entities.Elements.Code;
using FlowConsole.Core.Entities.Elements.Infra;
using FlowConsole.Core.Evidence;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Factories;

/// <summary>
/// Creates the correct <see cref="ElementBase"/> subtype from an <see cref="ElementKind"/> discriminator.
/// Used when deserializing from AGE graph or external DTOs where the concrete type is not known at compile time.
/// </summary>
public static class ElementFactory
{
    public static ElementBase Create(
        ElementKind kind,
        ElementId id,
        string name,
        ElementSource source,
        string? description = null,
        string? technology = null,
        ElementId? parentId = null,
        string? canonicalId = null,
        IReadOnlyList<string>? aliases = null,
        IReadOnlyDictionary<string, string>? properties = null,
        IReadOnlyList<Tag>? tags = null)
    {
        var props = properties ?? new Dictionary<string, string>();
        var tagList = tags ?? [];

        return kind switch
        {
            ElementKind.Class => new ClassElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList,
                IsAbstract = GetBool(props, "isAbstract"),
                Namespace = GetString(props, "namespace")
            },
            ElementKind.Interface => new InterfaceElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList,
                Namespace = GetString(props, "namespace")
            },
            ElementKind.Endpoint => new EndpointElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList,
                HttpMethod = GetString(props, "httpMethod"),
                Route = GetString(props, "route")
            },
            ElementKind.Function => new FunctionElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList
            },
            ElementKind.Producer => new ProducerElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList,
                Topic = GetString(props, "topic"),
                BrokerType = GetString(props, "brokerType")
            },
            ElementKind.Consumer => new ConsumerElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList,
                Topic = GetString(props, "topic"),
                BrokerType = GetString(props, "brokerType")
            },
            ElementKind.Deployment => new DeploymentElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList,
                Replicas = GetInt(props, "replicas")
            },
            ElementKind.Database => new DatabaseElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList,
                Engine = GetString(props, "engine")
            },
            ElementKind.Queue => new QueueElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList
            },
            ElementKind.Cache => new CacheElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList
            },
            ElementKind.Ingress => new IngressElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList
            },
            ElementKind.Namespace => new NamespaceElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList
            },
            ElementKind.Service => new ServiceElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList,
                InferenceConfidence = GetConfidence(props, "inferenceConfidence")
            },
            ElementKind.Application => new ApplicationElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList
            },
            ElementKind.Module => new ModuleElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList
            },
            ElementKind.External => new ExternalElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList
            },
            ElementKind.Gateway => new GatewayElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList
            },
            ElementKind.Worker => new WorkerElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList,
                InferenceConfidence = GetConfidence(props, "inferenceConfidence")
            },
            ElementKind.Broker => new BrokerElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList
            },
            ElementKind.Topic => new TopicElement
            {
                Id = id,
                Name = name,
                Source = source,
                Description = description,
                Technology = technology,
                ParentId = parentId,
                CanonicalId = canonicalId,
                Aliases = aliases,
                Properties = props,
                Tags = tagList,
                Partitions = GetInt(props, "partitions")
            },
            _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, $"Unknown ElementKind: {kind}")
        };
    }

    private static string? GetString(IReadOnlyDictionary<string, string> props, string key)
        => props.TryGetValue(key, out var value) ? value : null;

    private static bool GetBool(IReadOnlyDictionary<string, string> props, string key)
        => props.TryGetValue(key, out var value) && bool.TryParse(value, out var result) && result;

    private static int? GetInt(IReadOnlyDictionary<string, string> props, string key)
        => props.TryGetValue(key, out var value) && int.TryParse(value, out var result) ? result : null;

    private static Confidence? GetConfidence(IReadOnlyDictionary<string, string> props, string key)
        => props.TryGetValue(key, out var value) && Enum.TryParse<Confidence>(value, ignoreCase: true, out var result) ? result : null;
}
