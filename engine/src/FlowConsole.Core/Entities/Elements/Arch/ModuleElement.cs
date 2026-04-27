using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Arch;

public sealed record ModuleElement : ArchElement
{
    public override ElementKind Kind => ElementKind.Module;
}
