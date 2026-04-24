using FlowConsole.Core.Entities;
using FlowConsole.Core.Entities.Elements.Arch;
using FlowConsole.Core.Entities.Relations;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Snapshots.Mapping;
using FluentAssertions;

namespace FlowConsole.Snapshots.Mapping.Tests;

public class MergeSnapshotsTests
{
    [Fact]
    public void Merge_EmptyList_ReturnsEmptySnapshot()
    {
        var result = SnapshotMerger.Merge([], ElementSource.CodeScan);

        result.Source.Should().Be(ElementSource.CodeScan);
        result.Elements.Should().BeEmpty();
        result.Relationships.Should().BeEmpty();
    }

    [Fact]
    public void Merge_SingleSnapshot_ReturnsSameElementsAndRelationships()
    {
        var element = new ServiceElement
        {
            Id = new ElementId("svc-1"),
            Name = "Service 1",
            Source = ElementSource.CodeScan
        };
        var rel = new DependsOnRelation
        {
            Id = new RelationshipId("rel-1"),
            SourceId = new ElementId("svc-1"),
            TargetId = new ElementId("svc-2"),
            Source = ElementSource.CodeScan
        };
        var snapshot = new ModelSnapshot(ElementSource.CodeScan, [element], [rel]);

        var result = SnapshotMerger.Merge([snapshot], ElementSource.CodeScan);

        result.Elements.Should().HaveCount(1);
        result.Relationships.Should().HaveCount(1);
        result.Elements[0].Name.Should().Be("Service 1");
    }

    [Fact]
    public void Merge_DuplicateElementIds_LastWins()
    {
        var e1 = new ServiceElement { Id = new ElementId("svc"), Name = "First", Source = ElementSource.CodeScan };
        var e2 = new ServiceElement { Id = new ElementId("svc"), Name = "Second", Source = ElementSource.CodeScan };
        var snap1 = new ModelSnapshot(ElementSource.CodeScan, [e1], []);
        var snap2 = new ModelSnapshot(ElementSource.CodeScan, [e2], []);

        var result = SnapshotMerger.Merge([snap1, snap2], ElementSource.CodeScan);

        result.Elements.Should().HaveCount(1);
        result.Elements[0].Name.Should().Be("Second");
    }

    [Fact]
    public void Merge_DuplicateRelationshipIds_LastWins()
    {
        var r1 = new DependsOnRelation
        {
            Id = new RelationshipId("rel"),
            SourceId = new ElementId("a"),
            TargetId = new ElementId("b"),
            Technology = "HTTP",
            Source = ElementSource.CodeScan
        };
        var r2 = new DependsOnRelation
        {
            Id = new RelationshipId("rel"),
            SourceId = new ElementId("a"),
            TargetId = new ElementId("b"),
            Technology = "gRPC",
            Source = ElementSource.CodeScan
        };
        var snap1 = new ModelSnapshot(ElementSource.CodeScan, [], [r1]);
        var snap2 = new ModelSnapshot(ElementSource.CodeScan, [], [r2]);

        var result = SnapshotMerger.Merge([snap1, snap2], ElementSource.CodeScan);

        result.Relationships.Should().HaveCount(1);
        result.Relationships[0].Technology.Should().Be("gRPC");
    }

    [Fact]
    public void Merge_MultipleSnapshots_PreservesUniqueElements()
    {
        var e1 = new ServiceElement { Id = new ElementId("svc-1"), Name = "Svc1", Source = ElementSource.CodeScan };
        var e2 = new ServiceElement { Id = new ElementId("svc-2"), Name = "Svc2", Source = ElementSource.CodeScan };
        var snap1 = new ModelSnapshot(ElementSource.CodeScan, [e1], []);
        var snap2 = new ModelSnapshot(ElementSource.CodeScan, [e2], []);

        var result = SnapshotMerger.Merge([snap1, snap2], ElementSource.CodeScan);

        result.Elements.Should().HaveCount(2);
    }

    [Fact]
    public void Merge_SetsSourceFromParameter()
    {
        var element = new ServiceElement { Id = new ElementId("svc"), Name = "Svc", Source = ElementSource.Git };
        var snapshot = new ModelSnapshot(ElementSource.Git, [element], []);

        var result = SnapshotMerger.Merge([snapshot], ElementSource.CodeScan);

        result.Source.Should().Be(ElementSource.CodeScan);
    }
}
