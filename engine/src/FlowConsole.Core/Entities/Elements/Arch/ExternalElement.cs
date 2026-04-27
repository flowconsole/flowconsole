using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Arch;

public sealed record ExternalElement : ArchElement
{
    public override ElementKind Kind => ElementKind.External;
}
