using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Arch;

public sealed record ApplicationElement : ArchElement
{
    public override ElementKind Kind => ElementKind.Application;
}
