namespace FlowConsole.Rules.Core.Model;

/// <summary>
/// Rule evaluation strategy.
/// </summary>
public enum RuleKind
{
    Element,
    Flow
}

/// <summary>
/// Model projection against which the rule is evaluated.
/// </summary>
public enum RuleTarget
{
    Model,
    Actual,
    Diff
}

/// <summary>
/// Severity level assigned to a rule result.
/// </summary>
public enum Severity
{
    Info,
    Warning,
    Error,
    Critical
}

/// <summary>
/// Type of projection items selected by a selector.
/// </summary>
public enum EntityType
{
    Elements,
    Relationships,
    DiffItems
}

/// <summary>
/// Evaluation mode for element rules.
/// </summary>
public enum ElementMode
{
    PerItem,
    Aggregate
}

/// <summary>
/// Evaluation mode for flow rules.
/// </summary>
public enum FlowMode
{
    PerPath,
    Aggregate
}

/// <summary>
/// Kind of change in the diff projection.
/// </summary>
public enum ChangeKind
{
    Added,
    Removed,
    Changed,
    UnmatchedModel,
    UnmatchedActual
}

/// <summary>
/// How the via selector constrains intermediate nodes.
/// </summary>
public enum ViaMode
{
    Include,
    Exclude
}

/// <summary>
/// Source family used to narrow actual or diff projections.
/// </summary>
public enum SourceFamily
{
    Code,
    Infra,
    Import,
    Git
}
