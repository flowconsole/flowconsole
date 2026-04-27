using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Arch;

public sealed record GatewayElement : ArchElement
{
    public override ElementKind Kind => ElementKind.Gateway;
}
