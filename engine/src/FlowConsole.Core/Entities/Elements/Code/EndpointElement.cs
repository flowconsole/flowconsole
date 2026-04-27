using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Code;

public sealed record EndpointElement : CodeElement
{
    public override ElementKind Kind => ElementKind.Endpoint;
    public string? HttpMethod { get; init; }
    public string? Route { get; init; }
}
