namespace FlowConsole.Core.ValueObjects;

public enum ElementKind
{
    // Code layer
    Class,
    Interface,
    Endpoint,
    Function,
    Producer,
    Consumer,

    // Infra layer
    Deployment,
    Database,
    Queue,
    Cache,
    Ingress,
    Namespace,
    Broker,
    Topic,

    // Architecture layer
    Service,
    Application,
    Module,
    External,
    Gateway,
    Worker
}

public static class ElementKindExtensions
{
    public static ElementLayer GetLayer(this ElementKind kind) => kind switch
    {
        ElementKind.Class => ElementLayer.Code,
        ElementKind.Interface => ElementLayer.Code,
        ElementKind.Endpoint => ElementLayer.Code,
        ElementKind.Function => ElementLayer.Code,
        ElementKind.Producer => ElementLayer.Code,
        ElementKind.Consumer => ElementLayer.Code,

        ElementKind.Deployment => ElementLayer.Infra,
        ElementKind.Database => ElementLayer.Infra,
        ElementKind.Queue => ElementLayer.Infra,
        ElementKind.Cache => ElementLayer.Infra,
        ElementKind.Ingress => ElementLayer.Infra,
        ElementKind.Namespace => ElementLayer.Infra,
        ElementKind.Broker => ElementLayer.Infra,
        ElementKind.Topic => ElementLayer.Infra,

        ElementKind.Service => ElementLayer.Architecture,
        ElementKind.Application => ElementLayer.Architecture,
        ElementKind.Module => ElementLayer.Architecture,
        ElementKind.External => ElementLayer.Architecture,
        ElementKind.Gateway => ElementLayer.Architecture,
        ElementKind.Worker => ElementLayer.Architecture,

        _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, $"Unknown ElementKind: {kind}")
    };
}
