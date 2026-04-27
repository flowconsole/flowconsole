using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities;

public sealed record MetaSchema
{
    public MetaSchemaId Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public bool IsBuiltin { get; init; }
    public ProjectId? ProjectId { get; init; }
    public MetaSchemaId? ExtendsSchemaId { get; init; }
    public IReadOnlyList<MetaElementType> ElementTypes { get; init; } = [];
    public IReadOnlyList<MetaRelationType> RelationTypes { get; init; } = [];
    public IReadOnlyList<MetaValidationRule> Rules { get; init; } = [];
}

public sealed record MetaElementType
{
    public ElementKind Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Icon { get; init; }
    public string? Color { get; init; }
    public bool AllowChildren { get; init; }
    public IReadOnlyList<ElementKind> AllowedChildTypes { get; init; } = [];
    public IReadOnlyList<PropertyDefinition> PropertyDefinitions { get; init; } = [];
}

public sealed record MetaRelationType
{
    public RelationKind Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public IReadOnlyList<ElementKind> AllowedSourceTypes { get; init; } = [];
    public IReadOnlyList<ElementKind> AllowedTargetTypes { get; init; } = [];
    public IReadOnlyList<PropertyDefinition> PropertyDefinitions { get; init; } = [];
}

public sealed record PropertyDefinition
{
    public string Key { get; init; } = string.Empty;
    public string Type { get; init; } = "string";
    public bool Required { get; init; }
    public string? DefaultValue { get; init; }
    public IReadOnlyList<string>? AllowedValues { get; init; }
}

public sealed record MetaValidationRule
{
    public string Name { get; init; } = string.Empty;
    public string RuleType { get; init; } = string.Empty;
    public string? Expression { get; init; }
    public string Severity { get; init; } = "warning";
    public string Message { get; init; } = string.Empty;
}
