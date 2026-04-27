namespace FlowConsole.Core.Enums;

/// <summary>
/// Controls how imported elements are merged into the graph when an import runs.
/// </summary>
public enum MergeStrategy
{
    /// <summary>Delete all elements from the "import" source, then add new ones.</summary>
    Replace,

    /// <summary>Update existing elements by ID, add new ones; do not delete absent elements.</summary>
    Merge,

    /// <summary>Add only elements whose ID does not yet exist in the graph; skip existing.</summary>
    Skip
}
