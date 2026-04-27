namespace FlowConsole.Core.ValueObjects;

public enum RelationKind
{
    Contains,
    DeployedOn,
    Uses,
    Calls,
    DependsOn,
    Imports,
    Implements,
    Produces,
    Consumes,
    Exposes,
    RoutesTo
}
