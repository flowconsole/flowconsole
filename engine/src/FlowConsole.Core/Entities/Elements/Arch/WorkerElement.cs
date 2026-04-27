using FlowConsole.Core.Evidence;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements.Arch;

public sealed record WorkerElement : ArchElement
{
    public override ElementKind Kind => ElementKind.Worker;
    public Confidence? InferenceConfidence { get; init; }
}
