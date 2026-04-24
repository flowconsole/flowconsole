using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Infra;

public sealed record DatabaseElement : InfraElement
{
    public override ElementKind Kind => ElementKind.Database;
    public string? Engine { get; init; }
}
