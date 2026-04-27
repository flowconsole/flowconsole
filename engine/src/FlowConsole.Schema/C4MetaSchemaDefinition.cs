using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Schema;

public static class C4MetaSchemaDefinition
{
    public static readonly MetaSchemaId SchemaId = new("c4");
    public const string SchemaName = "C4";

    // Element kinds (mapped from C4 concepts to ElementKind)
    public const ElementKind Person = ElementKind.External;
    public const ElementKind SoftwareSystem = ElementKind.Application;
    public const ElementKind Container = ElementKind.Service;
    public const ElementKind Component = ElementKind.Module;
    public const ElementKind DeploymentNode = ElementKind.Deployment;

    // Relation kinds (mapped from C4 concepts to RelationKind)
    public const RelationKind Uses = RelationKind.Uses;
    public const RelationKind Delivers = RelationKind.DependsOn;
    public const RelationKind Interacts = RelationKind.Calls;
    public const RelationKind ComposedOf = RelationKind.Contains;
    public const RelationKind DeployedOn = RelationKind.DeployedOn;

    public static MetaSchema Create()
    {
        var allElementTypes = new[] { Person, SoftwareSystem, Container, Component, DeploymentNode };

        return new MetaSchema
        {
            Id = SchemaId,
            Name = SchemaName,
            IsBuiltin = true,
            ProjectId = null,
            ExtendsSchemaId = null,
            ElementTypes = CreateElementTypes(),
            RelationTypes = CreateRelationTypes(allElementTypes),
            Rules = []
        };
    }

    private static IReadOnlyList<MetaElementType> CreateElementTypes()
    {
        return
        [
            new MetaElementType
            {
                Id = Person,
                Name = "Person",
                Icon = "person",
                Color = "#08427B",
                AllowChildren = false,
                AllowedChildTypes = [],
                PropertyDefinitions =
                [
                    new PropertyDefinition { Key = "email", Type = "string", Required = false },
                    new PropertyDefinition { Key = "role", Type = "string", Required = false }
                ]
            },
            new MetaElementType
            {
                Id = SoftwareSystem,
                Name = "Software System",
                Icon = "system",
                Color = "#1168BD",
                AllowChildren = true,
                AllowedChildTypes = [Container],
                PropertyDefinitions =
                [
                    new PropertyDefinition { Key = "url", Type = "string", Required = false },
                    new PropertyDefinition { Key = "owner", Type = "string", Required = false }
                ]
            },
            new MetaElementType
            {
                Id = Container,
                Name = "Container",
                Icon = "container",
                Color = "#438DD5",
                AllowChildren = true,
                AllowedChildTypes = [Component],
                PropertyDefinitions =
                [
                    new PropertyDefinition { Key = "port", Type = "int", Required = false },
                    new PropertyDefinition { Key = "protocol", Type = "string", Required = false }
                ]
            },
            new MetaElementType
            {
                Id = Component,
                Name = "Component",
                Icon = "component",
                Color = "#85BBF0",
                AllowChildren = false,
                AllowedChildTypes = [],
                PropertyDefinitions =
                [
                    new PropertyDefinition { Key = "framework", Type = "string", Required = false }
                ]
            },
            new MetaElementType
            {
                Id = DeploymentNode,
                Name = "Deployment Node",
                Icon = "deployment",
                Color = "#999999",
                AllowChildren = true,
                AllowedChildTypes = [DeploymentNode],
                PropertyDefinitions =
                [
                    new PropertyDefinition { Key = "provider", Type = "string", Required = false },
                    new PropertyDefinition { Key = "region", Type = "string", Required = false },
                    new PropertyDefinition { Key = "instances", Type = "int", Required = false }
                ]
            }
        ];
    }

    private static IReadOnlyList<MetaRelationType> CreateRelationTypes(
        ElementKind[] allElementTypes)
    {
        return
        [
            new MetaRelationType
            {
                Id = Uses,
                Name = "Uses",
                AllowedSourceTypes = allElementTypes,
                AllowedTargetTypes = allElementTypes,
                PropertyDefinitions =
                [
                    new PropertyDefinition { Key = "protocol", Type = "string", Required = false },
                    new PropertyDefinition { Key = "async", Type = "bool", Required = false }
                ]
            },
            new MetaRelationType
            {
                Id = Delivers,
                Name = "Delivers",
                AllowedSourceTypes = allElementTypes,
                AllowedTargetTypes = allElementTypes,
                PropertyDefinitions =
                [
                    new PropertyDefinition { Key = "format", Type = "string", Required = false }
                ]
            },
            new MetaRelationType
            {
                Id = Interacts,
                Name = "Interacts With",
                AllowedSourceTypes = [Person],
                AllowedTargetTypes = [SoftwareSystem, Container, Component],
                PropertyDefinitions = []
            },
            new MetaRelationType
            {
                Id = ComposedOf,
                Name = "Composed Of",
                AllowedSourceTypes = [SoftwareSystem, Container],
                AllowedTargetTypes = [Container, Component],
                PropertyDefinitions = []
            },
            new MetaRelationType
            {
                Id = DeployedOn,
                Name = "Deployed On",
                AllowedSourceTypes = [Container, Component],
                AllowedTargetTypes = [DeploymentNode],
                PropertyDefinitions = []
            }
        ];
    }
}
