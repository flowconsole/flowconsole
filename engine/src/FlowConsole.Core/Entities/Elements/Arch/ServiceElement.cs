using FlowConsole.Core.Evidence;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Arch;

public sealed record ServiceElement : ArchElement
{
    public override ElementKind Kind => ElementKind.Service;
    public Confidence? InferenceConfidence { get; init; }
}
