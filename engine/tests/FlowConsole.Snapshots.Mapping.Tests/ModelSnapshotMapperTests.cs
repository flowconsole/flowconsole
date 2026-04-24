using FlowConsole.Core.Entities;
using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Entities.Elements.Arch;
using FlowConsole.Core.Entities.Elements.Code;
using FlowConsole.Core.Entities.Relations;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Snapshots.Mapping;
using FluentAssertions;

namespace FlowConsole.Snapshots.Mapping.Tests;

public class ModelSnapshotMapperTests
{
    [Fact]
    public void Map_EmptySnapshot_ReturnsEmptyLists()
    {
        var snapshot = new ModelSnapshot(ElementSource.CodeScan, [], []);

        var (elements, relationships) = ModelSnapshotMapper.Map(snapshot);

        elements.Should().BeEmpty();
        relationships.Should().BeEmpty();
    }

    [Fact]
    public void Map_ServiceElement_MapsAllFields()
    {
        var element = new ServiceElement
        {
            Id = new ElementId("user-service"),
            Name = "User Service",
            Description = "Manages users",
            Technology = "ASP.NET Core",
            Source = ElementSource.Git,
            Tags = [new Tag("backend")],
            Properties = new Dictionary<string, string> { ["team"] = "platform" }
        };
        var snapshot = new ModelSnapshot(ElementSource.Git, [element], []);

        var (elements, _) = ModelSnapshotMapper.Map(snapshot);

        elements.Should().HaveCount(1);
        var mapped = elements[0];
        mapped.Id.Should().Be("user-service");
        mapped.Kind.Should().Be("Service");
        mapped.Name.Should().Be("User Service");
        mapped.Technology.Should().Be("ASP.NET Core");
        mapped.Source.Should().Be("Git");
        mapped.SourceFamily.Should().Be("Git");
        mapped.Tags.Should().ContainSingle().Which.Should().Be("backend");
        mapped.Properties.Should().ContainKey("team").WhoseValue.Should().Be("platform");
    }

    [Fact]
    public void Map_CanonicalId_Passthrough_WhenSet()
    {
        var element = new ServiceElement
        {
            Id = new ElementId("user-service"),
            Name = "User Service",
            Source = ElementSource.CodeScan,
            CanonicalId = "custom:canonical-id"
        };
        var snapshot = new ModelSnapshot(ElementSource.CodeScan, [element], []);

        var (elements, _) = ModelSnapshotMapper.Map(snapshot);

        elements[0].CanonicalId.Should().Be("custom:canonical-id");
    }

    [Fact]
    public void Map_CanonicalId_ComputedAsSourceColonId_WhenNotSet()
    {
        var element = new ServiceElement
        {
            Id = new ElementId("user-service"),
            Name = "User Service",
            Source = ElementSource.CodeScan
        };
        var snapshot = new ModelSnapshot(ElementSource.CodeScan, [element], []);

        var (elements, _) = ModelSnapshotMapper.Map(snapshot);

        elements[0].CanonicalId.Should().Be("codescan:user-service");
    }

    [Fact]
    public void Map_Relationship_MapsAllFields()
    {
        var relationship = new DependsOnRelation
        {
            Id = new RelationshipId("rel-1"),
            SourceId = new ElementId("svc-a"),
            TargetId = new ElementId("svc-b"),
            Technology = "gRPC",
            Source = ElementSource.CodeScan,
            Properties = new Dictionary<string, string> { ["async"] = "true" }
        };
        var snapshot = new ModelSnapshot(ElementSource.CodeScan, [], [relationship]);

        var (_, relationships) = ModelSnapshotMapper.Map(snapshot);

        relationships.Should().HaveCount(1);
        var mapped = relationships[0];
        mapped.Id.Should().Be("rel-1");
        mapped.Kind.Should().Be("DependsOn");
        mapped.SourceId.Should().Be("svc-a");
        mapped.TargetId.Should().Be("svc-b");
        mapped.Technology.Should().Be("gRPC");
        mapped.Source.Should().Be("CodeScan");
        mapped.SourceFamily.Should().Be("Code");
        mapped.Properties.Should().ContainKey("async").WhoseValue.Should().Be("true");
    }

    [Fact]
    public void Map_ClassElement_MapsKindCorrectly()
    {
        var element = new ClassElement
        {
            Id = new ElementId("my-class"),
            Name = "MyClass",
            Source = ElementSource.CodeScan
        };
        var snapshot = new ModelSnapshot(ElementSource.CodeScan, [element], []);

        var (elements, _) = ModelSnapshotMapper.Map(snapshot);

        elements[0].Kind.Should().Be("Class");
        elements[0].SourceFamily.Should().Be("Code");
    }

    [Fact]
    public void Map_ElementWithParentId_MapsParentId()
    {
        var element = new ClassElement
        {
            Id = new ElementId("inner-class"),
            Name = "InnerClass",
            Source = ElementSource.CodeScan,
            ParentId = new ElementId("outer-class")
        };
        var snapshot = new ModelSnapshot(ElementSource.CodeScan, [element], []);

        var (elements, _) = ModelSnapshotMapper.Map(snapshot);

        elements[0].ParentId.Should().Be("outer-class");
    }

    [Fact]
    public void Map_ElementWithoutParentId_ParentIdIsNull()
    {
        var element = new ServiceElement
        {
            Id = new ElementId("svc"),
            Name = "Svc",
            Source = ElementSource.Git
        };
        var snapshot = new ModelSnapshot(ElementSource.Git, [element], []);

        var (elements, _) = ModelSnapshotMapper.Map(snapshot);

        elements[0].ParentId.Should().BeNull();
    }

    [Fact]
    public void Map_MissingOptionalFields_DefaultsApplied()
    {
        var element = new ServiceElement
        {
            Id = new ElementId("minimal"),
            Name = "Minimal",
            Source = ElementSource.Import
        };
        var snapshot = new ModelSnapshot(ElementSource.Import, [element], []);

        var (elements, _) = ModelSnapshotMapper.Map(snapshot);

        var mapped = elements[0];
        mapped.Technology.Should().BeNull();
        mapped.Tags.Should().BeEmpty();
        mapped.Properties.Should().BeEmpty();
        mapped.SourceFamily.Should().Be("Import");
    }

    [Fact]
    public void Map_DuplicateElementIds_BothPresent()
    {
        var e1 = new ServiceElement { Id = new ElementId("svc"), Name = "Svc1", Source = ElementSource.Git };
        var e2 = new ServiceElement { Id = new ElementId("svc"), Name = "Svc2", Source = ElementSource.Git };
        var snapshot = new ModelSnapshot(ElementSource.Git, [e1, e2], []);

        var (elements, _) = ModelSnapshotMapper.Map(snapshot);

        elements.Should().HaveCount(2);
    }

    [Fact]
    public void Map_Observability_PropagatesNotSupportedException()
    {
        var element = new ServiceElement
        {
            Id = new ElementId("svc"),
            Name = "Svc",
            Source = ElementSource.Observability
        };
        var snapshot = new ModelSnapshot(ElementSource.Observability, [element], []);

        var act = () => ModelSnapshotMapper.Map(snapshot);

        act.Should().Throw<NotSupportedException>();
    }

    [Fact]
    public void Map_InfraScan_MapsToInfraFamily()
    {
        var element = new ServiceElement
        {
            Id = new ElementId("k8s-svc"),
            Name = "K8s Service",
            Source = ElementSource.InfraScan
        };
        var snapshot = new ModelSnapshot(ElementSource.InfraScan, [element], []);

        var (elements, _) = ModelSnapshotMapper.Map(snapshot);

        elements[0].Source.Should().Be("InfraScan");
        elements[0].SourceFamily.Should().Be("Infra");
    }

    [Fact]
    public void Map_GitElementInNonGitSnapshot_PreservesElementSource()
    {
        // Regression: ElementSource.Git is enum zero (default), so the old != default
        // check would incorrectly override it with the snapshot source.
        var element = new ServiceElement
        {
            Id = new ElementId("git-svc"),
            Name = "Git Service",
            Source = ElementSource.Git
        };
        var snapshot = new ModelSnapshot(ElementSource.CodeScan, [element], []);

        var (elements, _) = ModelSnapshotMapper.Map(snapshot);

        elements[0].Source.Should().Be("Git");
        elements[0].SourceFamily.Should().Be("Git");
        elements[0].CanonicalId.Should().Be("git:git-svc");
    }
}
