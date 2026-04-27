using FlowConsole.Rules.Core.Bindings;
using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Execution;
using FlowConsole.Rules.Core.Model;

namespace FlowConsole.Rules.Core.Abstractions;

/// <summary>
/// Finds paths in the element graph for flow rules.
/// Resolves from/to/via selectors and applies depth/cycle constraints.
/// </summary>
public interface IPathFinder
{
    /// <summary>
    /// Finds all paths matching the flow rule constraints.
    /// </summary>
    /// <param name="from">Source selector (entity must be Elements).</param>
    /// <param name="to">Target selector (entity must be Elements).</param>
    /// <param name="via">Optional intermediate node filter.</param>
    /// <param name="viaMode">Include or Exclude mode for via filter.</param>
    /// <param name="maxDepth">Maximum path depth (number of edges).</param>
    /// <param name="allowCycles">
    /// false: unique vertices per path. true: unique edges (vertices may repeat).
    /// </param>
    /// <param name="ruleSourceFamilies">Top-level rule sourceFamilies for graph traversal filtering.</param>
    /// <returns>
    /// On success: list of paths found. On failure: RE_PATH_ENDPOINTS_EMPTY if from/to match zero elements.
    /// </returns>
    PathFinderResult FindPaths(
        CompiledSelector from,
        CompiledSelector to,
        CompiledSelector? via,
        ViaMode viaMode,
        int maxDepth,
        bool allowCycles,
        IReadOnlyList<SourceFamily>? ruleSourceFamilies);
}

/// <summary>
/// Result of path finding. Contains either paths or an error.
/// </summary>
public sealed record PathFinderResult
{
    public IReadOnlyList<PathRef> Paths { get; init; } = [];
    public RuleExecutionError? Error { get; init; }

    public bool IsSuccess => Error is null;
}
