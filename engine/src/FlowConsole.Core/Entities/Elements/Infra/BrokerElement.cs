using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Infra;

public sealed record BrokerElement : InfraElement
{
    public override ElementKind Kind => ElementKind.Broker;
}
