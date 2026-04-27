using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Infra;

public sealed record QueueElement : InfraElement
{
    public override ElementKind Kind => ElementKind.Queue;
}
