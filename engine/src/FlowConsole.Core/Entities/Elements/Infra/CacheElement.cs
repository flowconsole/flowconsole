using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Infra;

public sealed record CacheElement : InfraElement
{
    public override ElementKind Kind => ElementKind.Cache;
}
