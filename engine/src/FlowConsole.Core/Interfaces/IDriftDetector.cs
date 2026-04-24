using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Interfaces;

public interface IDriftDetector
{
    /// <param name="scanSource">
    /// Scan source to compare against git (e.g. "CodeScan", "InfraScan").
    /// When null, compares git against all non-git sources combined.
    /// </param>
    Task<DriftResult> DetectAsync(ModelId modelId, string? scanSource, CancellationToken ct);
}
