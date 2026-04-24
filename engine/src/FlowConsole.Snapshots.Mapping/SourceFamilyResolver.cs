using FlowConsole.Core.ValueObjects;
using FlowConsole.Rules.Core.Model;

namespace FlowConsole.Snapshots.Mapping;

/// <summary>
/// Maps <see cref="ElementSource"/> to <see cref="SourceFamily"/> per Decision D1.
/// Only 4 mappings are supported in Phase 1/2. Observability is deferred to Phase 6.
/// </summary>
public static class SourceFamilyResolver
{
    public static SourceFamily Resolve(ElementSource source) => source switch
    {
        ElementSource.Git => SourceFamily.Git,
        ElementSource.CodeScan => SourceFamily.Code,
        ElementSource.InfraScan => SourceFamily.Infra,
        ElementSource.Import => SourceFamily.Import,
        ElementSource.Observability => throw new NotSupportedException(
            "ElementSource.Observability is not yet supported by this version. Please update to a newer release."),
        _ => throw new ArgumentOutOfRangeException(nameof(source), source, $"Unknown ElementSource: {source}")
    };
}
