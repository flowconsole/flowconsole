namespace FlowConsole.Rules.Core.Abstractions;

/// <summary>
/// Registry of helper functions available in rule expressions.
/// Used for compile-time validation of function names, overloads, and signatures.
/// </summary>
public interface IHelperCatalog
{
    /// <summary>
    /// Returns true if the given name is a registered helper function.
    /// </summary>
    bool IsKnownHelper(string name);

    /// <summary>
    /// Returns all overload signatures for a helper function.
    /// Empty if the function is not known.
    /// </summary>
    IReadOnlyList<HelperSignature> GetSignatures(string name);

    /// <summary>
    /// Returns all reserved names (helper names + binding names) that cannot
    /// be used as let-variable names.
    /// </summary>
    IReadOnlySet<string> GetReservedNames();
}

/// <summary>
/// Describes one overload of a helper function for compile-time validation.
/// </summary>
public sealed record HelperSignature(
    string Name,
    IReadOnlyList<HelperParameter> Parameters,
    Type ReturnType);

/// <summary>
/// A parameter in a helper function signature.
/// </summary>
public sealed record HelperParameter(
    string Name,
    Type Type,
    bool IsLambda = false);
