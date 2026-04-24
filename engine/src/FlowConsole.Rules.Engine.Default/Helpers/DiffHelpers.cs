using FlowConsole.Rules.Core.Bindings;

namespace FlowConsole.Rules.Engine.Default.Helpers;

/// <summary>
/// Pure C# implementations of diff helper functions defined in helpers.md.
/// changed, before, after. Only defined for DiffItem.
/// </summary>
internal static class DiffHelpers
{
    /// <summary>
    /// changed(item, field) -> bool
    /// True if item.changeKind == "Changed" and field is in item.fieldChanges.
    /// False for any other changeKind.
    /// </summary>
    public static bool Changed(DiffItem item, string field)
    {
        if (!string.Equals(item.ChangeKind, "Changed", StringComparison.OrdinalIgnoreCase))
            return false;

        return item.FieldChanges is not null && item.FieldChanges.ContainsKey(field);
    }

    /// <summary>
    /// before(item, field) -> dyn
    /// Returns the value of field in the model-version of the DiffItem.
    /// - changeKind=Changed: fieldChanges[field].before if present, else model.properties or top-level field, else null
    /// - changeKind=Removed/UnmatchedModel: value from item.model
    /// - changeKind=Added/UnmatchedActual: null (no model version)
    /// </summary>
    public static object? Before(DiffItem item, string field)
    {
        var changeKind = item.ChangeKind.ToLowerInvariant();

        if (changeKind is "added" or "unmatchedactual")
            return null;

        if (changeKind == "changed")
        {
            // Check fieldChanges first
            if (item.FieldChanges is not null &&
                item.FieldChanges.TryGetValue(field, out var fc))
            {
                return fc.Before;
            }

            // Fall back to model element
            return GetFieldValue(item.Model, field);
        }

        // Removed or UnmatchedModel
        return GetFieldValue(item.Model, field);
    }

    /// <summary>
    /// after(item, field) -> dyn
    /// Returns the value of field in the actual-version of the DiffItem.
    /// - changeKind=Added/Changed/UnmatchedActual: value from item.actual
    /// - changeKind=Removed/UnmatchedModel: null (no actual version)
    /// </summary>
    public static object? After(DiffItem item, string field)
    {
        var changeKind = item.ChangeKind.ToLowerInvariant();

        if (changeKind is "removed" or "unmatchedmodel")
            return null;

        if (changeKind == "changed")
        {
            // Check fieldChanges first
            if (item.FieldChanges is not null &&
                item.FieldChanges.TryGetValue(field, out var fc))
            {
                return fc.After;
            }

            // Fall back to actual element
            return GetFieldValue(item.Actual, field);
        }

        // Added or UnmatchedActual
        return GetFieldValue(item.Actual, field);
    }

    /// <summary>
    /// Extract a field value from an ElementRef by name.
    /// Supports top-level fields (name, kind, technology, etc.) and properties.
    /// </summary>
    private static object? GetFieldValue(ElementRef? element, string field)
    {
        if (element is null)
            return null;

        return field.ToLowerInvariant() switch
        {
            "id" => element.Id,
            "canonicalid" => element.CanonicalId,
            "kind" => element.Kind,
            "name" => element.Name,
            "technology" => element.Technology,
            "source" => element.Source,
            "sourcefamily" => element.SourceFamily,
            "parentid" => element.ParentId,
            _ => element.Properties.TryGetValue(field, out var val) ? val : null
        };
    }
}
