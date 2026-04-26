using System.Text.RegularExpressions;
using FlowConsole.Core.Entities;
using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Entities.Relations;
using FlowConsole.Core.Interfaces;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Schema;

public sealed partial class ModelSnapshotValidator : IModelSnapshotValidator
{
    private static readonly Regex IdPattern = IdPatternRegex();

    public ModelSnapshotValidationResult ValidateStructural(ModelSnapshot snapshot)
    {
        var errors = new List<ModelSnapshotValidationError>();

        // Enforce single-source invariant: all elements and relationships must match the snapshot Source
        var snapshotSource = snapshot.Source;
        for (var i = 0; i < snapshot.Elements.Count; i++)
        {
            if (snapshot.Elements[i].Source != snapshotSource)
                errors.Add(new("STRUCT_030",
                    $"Element '{snapshot.Elements[i].Id.Value}' source '{snapshot.Elements[i].Source}' differs from snapshot source '{snapshotSource}'",
                    $"elements[{i}].source"));
        }

        for (var i = 0; i < snapshot.Relationships.Count; i++)
        {
            if (snapshot.Relationships[i].Source != snapshotSource)
                errors.Add(new("STRUCT_031",
                    $"Relationship '{snapshot.Relationships[i].Id.Value}' source '{snapshot.Relationships[i].Source}' differs from snapshot source '{snapshotSource}'",
                    $"relationships[{i}].source"));
        }

        if (errors.Count > 0)
            return new ModelSnapshotValidationResult { Errors = errors };

        var elementIds = new HashSet<string>();
        for (var i = 0; i < snapshot.Elements.Count; i++)
        {
            var elem = snapshot.Elements[i];
            var path = $"elements[{i}]";

            if (string.IsNullOrWhiteSpace(elem.Id.Value))
                errors.Add(new("STRUCT_010", "Element id is required", $"{path}.id"));
            else if (!IdPattern.IsMatch(elem.Id.Value))
                errors.Add(new("STRUCT_011", $"Element id '{elem.Id.Value}' does not match pattern ^[a-zA-Z0-9_][a-zA-Z0-9_.:-]*$", $"{path}.id"));
            else if (!elementIds.Add(elem.Id.Value))
                errors.Add(new("STRUCT_012", $"Duplicate element id '{elem.Id.Value}'", $"{path}.id"));

            if (string.IsNullOrWhiteSpace(elem.Name))
                errors.Add(new("STRUCT_015", "Element name is required", $"{path}.name"));
            else if (elem.Name.Length > 255)
                errors.Add(new("STRUCT_016", "Element name exceeds 255 characters", $"{path}.name"));

            if (elem.Description?.Length > 4096)
                errors.Add(new("STRUCT_017", "Element description exceeds 4096 characters", $"{path}.description"));

            if (elem.Technology?.Length > 255)
                errors.Add(new("STRUCT_018", "Element technology exceeds 255 characters", $"{path}.technology"));

            if (elem.Tags is not null)
            {
                foreach (var tag in elem.Tags)
                {
                    if (!IdPattern.IsMatch(tag.Value))
                        errors.Add(new("STRUCT_019", $"Tag '{tag.Value}' does not match pattern ^[a-zA-Z0-9_][a-zA-Z0-9_.:-]*$", $"{path}.tags"));
                }
            }
        }

        var relationshipIds = new HashSet<string>();
        for (var i = 0; i < snapshot.Relationships.Count; i++)
        {
            var rel = snapshot.Relationships[i];
            var path = $"relationships[{i}]";

            if (string.IsNullOrWhiteSpace(rel.Id.Value))
                errors.Add(new("STRUCT_020", "Relationship id is required", $"{path}.id"));
            else if (!IdPattern.IsMatch(rel.Id.Value))
                errors.Add(new("STRUCT_021", $"Relationship id '{rel.Id.Value}' does not match pattern ^[a-zA-Z0-9_][a-zA-Z0-9_.:-]*$", $"{path}.id"));
            else if (!relationshipIds.Add(rel.Id.Value))
                errors.Add(new("STRUCT_022", $"Duplicate relationship id '{rel.Id.Value}'", $"{path}.id"));

            if (string.IsNullOrWhiteSpace(rel.SourceId.Value))
                errors.Add(new("STRUCT_023", "Relationship sourceId is required", $"{path}.sourceId"));

            if (string.IsNullOrWhiteSpace(rel.TargetId.Value))
                errors.Add(new("STRUCT_024", "Relationship targetId is required", $"{path}.targetId"));

            if (rel.Label?.Length > 255)
                errors.Add(new("STRUCT_027", "Relationship label exceeds 255 characters", $"{path}.label"));

            if (rel.Technology?.Length > 255)
                errors.Add(new("STRUCT_028", "Relationship technology exceeds 255 characters", $"{path}.technology"));
        }

        return new ModelSnapshotValidationResult { Errors = errors };
    }

    public ModelSnapshotValidationResult ValidateDomain(ModelSnapshot snapshot, MetaSchema resolvedSchema)
    {
        var errors = new List<ModelSnapshotValidationError>();

        var elementTypeMap = resolvedSchema.ElementTypes.ToDictionary(t => t.Id);
        var relationTypeMap = resolvedSchema.RelationTypes.ToDictionary(t => t.Id);

        // Build element lookup for parentId and relationship validation
        var elementMap = new Dictionary<string, ElementBase>();
        foreach (var elem in snapshot.Elements)
        {
            if (!string.IsNullOrWhiteSpace(elem.Id.Value))
                elementMap[elem.Id.Value] = elem;
        }

        // Validate elements
        for (var i = 0; i < snapshot.Elements.Count; i++)
        {
            var elem = snapshot.Elements[i];
            var path = $"elements[{i}]";

            // Kind must exist in schema
            if (!elementTypeMap.TryGetValue(elem.Kind, out var elementType))
            {
                errors.Add(new("DOMAIN_001", $"Unknown element kind '{elem.Kind}' in meta-schema '{resolvedSchema.Name}'", $"{path}.kind"));
                continue;
            }

            // ParentId validation
            if (elem.ParentId is not null)
            {
                if (!elementMap.TryGetValue(elem.ParentId.Value.Value, out var parent))
                {
                    errors.Add(new("DOMAIN_002", $"ParentId '{elem.ParentId.Value.Value}' references non-existent element", $"{path}.parentId"));
                }
                else
                {
                    if (elementTypeMap.TryGetValue(parent.Kind, out var parentType))
                    {
                        if (!parentType.AllowChildren)
                        {
                            errors.Add(new("DOMAIN_003", $"Parent element '{elem.ParentId.Value.Value}' (kind '{parent.Kind}') does not allow children", $"{path}.parentId"));
                        }
                        else if (parentType.AllowedChildTypes.Count > 0 && !parentType.AllowedChildTypes.Contains(elem.Kind))
                        {
                            errors.Add(new("DOMAIN_004", $"Element kind '{elem.Kind}' is not allowed as child of '{parent.Kind}'", $"{path}.parentId"));
                        }
                    }
                }
            }

            // ParentId cycle detection
            if (elem.ParentId is not null && HasParentCycle(elem.Id.Value, elementMap))
            {
                errors.Add(new("DOMAIN_005", $"Cycle detected in parentId chain for element '{elem.Id.Value}'", $"{path}.parentId"));
            }

            // Property validation against PropertyDefinitions
            ValidateProperties(elem.Properties, elementType.PropertyDefinitions, path, errors);
        }

        // Validate relationships
        for (var i = 0; i < snapshot.Relationships.Count; i++)
        {
            var rel = snapshot.Relationships[i];
            var path = $"relationships[{i}]";

            // Kind must exist in schema
            if (!relationTypeMap.TryGetValue(rel.Kind, out var relationType))
            {
                errors.Add(new("DOMAIN_010", $"Unknown relationship kind '{rel.Kind}' in meta-schema '{resolvedSchema.Name}'", $"{path}.kind"));
                continue;
            }

            // SourceId must reference an existing element
            if (!elementMap.TryGetValue(rel.SourceId.Value, out var sourceElem))
            {
                errors.Add(new("DOMAIN_011", $"Relationship sourceId '{rel.SourceId.Value}' references non-existent element", $"{path}.sourceId"));
            }
            else if (relationType.AllowedSourceTypes.Count > 0)
            {
                if (!relationType.AllowedSourceTypes.Contains(sourceElem.Kind))
                {
                    errors.Add(new("DOMAIN_012", $"Source element kind '{sourceElem.Kind}' is not allowed for relationship kind '{rel.Kind}'", $"{path}.sourceId"));
                }
            }

            // TargetId must reference an existing element
            if (!elementMap.TryGetValue(rel.TargetId.Value, out var targetElem))
            {
                errors.Add(new("DOMAIN_013", $"Relationship targetId '{rel.TargetId.Value}' references non-existent element", $"{path}.targetId"));
            }
            else if (relationType.AllowedTargetTypes.Count > 0)
            {
                if (!relationType.AllowedTargetTypes.Contains(targetElem.Kind))
                {
                    errors.Add(new("DOMAIN_014", $"Target element kind '{targetElem.Kind}' is not allowed for relationship kind '{rel.Kind}'", $"{path}.targetId"));
                }
            }

            // Property validation
            ValidateProperties(rel.Properties, relationType.PropertyDefinitions, path, errors);
        }

        return new ModelSnapshotValidationResult { Errors = errors };
    }

    public ModelSnapshotValidationResult Validate(ModelSnapshot snapshot, MetaSchema resolvedSchema)
    {
        _ = resolvedSchema;
        return ValidateStructural(snapshot);
    }

    private static bool HasParentCycle(string elementId, Dictionary<string, ElementBase> elementMap)
    {
        var visited = new HashSet<string>();
        var current = elementId;

        while (current is not null)
        {
            if (!visited.Add(current))
                return true;

            if (!elementMap.TryGetValue(current, out var elem))
                break;

            current = elem.ParentId?.Value;
        }

        return false;
    }

    private static void ValidateProperties(
        IReadOnlyDictionary<string, string> properties,
        IReadOnlyList<PropertyDefinition> definitions,
        string path,
        List<ModelSnapshotValidationError> errors)
    {
        foreach (var propDef in definitions)
        {
            if (propDef.Required && !properties.ContainsKey(propDef.Key))
            {
                errors.Add(new("DOMAIN_020", $"Required property '{propDef.Key}' is missing", $"{path}.properties"));
            }
        }

        var definedKeys = definitions.ToDictionary(d => d.Key);
        foreach (var (key, value) in properties)
        {
            if (!definedKeys.TryGetValue(key, out var propDef))
                continue; // Additional properties are allowed

            if (propDef.AllowedValues is { Count: > 0 } && !propDef.AllowedValues.Contains(value))
            {
                errors.Add(new("DOMAIN_021", $"Property '{key}' value '{value}' is not in allowed values: [{string.Join(", ", propDef.AllowedValues)}]", $"{path}.properties.{key}"));
            }

            // Type validation for known types
            switch (propDef.Type)
            {
                case "int" when !int.TryParse(value, out _):
                    errors.Add(new("DOMAIN_022", $"Property '{key}' value '{value}' is not a valid integer", $"{path}.properties.{key}"));
                    break;
                case "bool" when !bool.TryParse(value, out _):
                    errors.Add(new("DOMAIN_023", $"Property '{key}' value '{value}' is not a valid boolean", $"{path}.properties.{key}"));
                    break;
            }
        }
    }

    [GeneratedRegex(@"^[a-zA-Z0-9_][a-zA-Z0-9_.:\-]*$")]
    private static partial Regex IdPatternRegex();
}
