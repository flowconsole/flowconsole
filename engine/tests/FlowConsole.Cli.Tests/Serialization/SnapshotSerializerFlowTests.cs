using System.Text.Json;
using FlowConsole.Cli.Serialization;
using FlowConsole.Core.Entities;
using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Entities.Relations;
using FlowConsole.Core.Factories;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Cli.Tests.Serialization;

public sealed class SnapshotSerializerFlowTests
{
    [Fact]
    public void SchemaVersion_Is_1_1_0()
    {
        SnapshotSerializer.SchemaVersion.Should().Be("1.1.0");
    }

    [Fact]
    public void ToJsonObject_WithFlows_EmitsFlowsSection()
    {
        var snapshot = CreateSnapshotWithFlows();
        var obj = SnapshotSerializer.ToJsonObject(snapshot);

        var json = obj.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.TryGetProperty("flows", out var flows).Should().BeTrue();
        flows.ValueKind.Should().Be(JsonValueKind.Array);
        flows.GetArrayLength().Should().Be(1);

        var flow = flows[0];
        flow.GetProperty("id").GetString().Should().Be("login-flow");
        flow.GetProperty("name").GetString().Should().Be("User Login");
        flow.GetProperty("description").GetString().Should().Be("Login sequence");

        var steps = flow.GetProperty("steps");
        steps.GetArrayLength().Should().Be(2);
        steps[0].GetProperty("sourceElementId").GetString().Should().Be("webapp");
        steps[0].GetProperty("relationshipId").GetString().Should().Be("webapp--calls-->api");
        steps[0].GetProperty("label").GetString().Should().Be("POST /login");
    }

    [Fact]
    public void ToJsonObject_WithActionStep_OmitsRelationshipId()
    {
        var snapshot = CreateSnapshotWithActionStep();
        var obj = SnapshotSerializer.ToJsonObject(snapshot);

        var json = obj.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
        using var doc = JsonDocument.Parse(json);
        var step = doc.RootElement.GetProperty("flows")[0].GetProperty("steps")[0];

        step.GetProperty("sourceElementId").GetString().Should().Be("api");
        step.TryGetProperty("relationshipId", out _).Should().BeFalse("action steps should omit relationshipId");
        step.GetProperty("label").GetString().Should().Be("validate input");
    }

    [Fact]
    public void ToJsonObject_WithoutFlows_OmitsFlowsKey()
    {
        var snapshot = new ModelSnapshot(
            ElementSource.Git,
            new[] { CreateElement("svc", ElementKind.Service, "My Service") },
            Array.Empty<RelationshipBase>());

        var obj = SnapshotSerializer.ToJsonObject(snapshot);

        var json = obj.ToJsonString();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.TryGetProperty("flows", out _).Should().BeFalse("flows should be omitted when null");
    }

    [Fact]
    public void ToJsonObject_EmptyFlows_OmitsFlowsKey()
    {
        var snapshot = new ModelSnapshot(
            ElementSource.Git,
            new[] { CreateElement("svc", ElementKind.Service, "My Service") },
            Array.Empty<RelationshipBase>(),
            Flows: Array.Empty<Flow>());

        var obj = SnapshotSerializer.ToJsonObject(snapshot);

        var json = obj.ToJsonString();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.TryGetProperty("flows", out _).Should().BeFalse("empty flows array should be omitted");
    }

    [Fact]
    public void ToJsonObject_FlowsSortedById()
    {
        var flows = new[]
        {
            new Flow("z-flow", "Z Flow", null, Array.Empty<FlowStep>()),
            new Flow("a-flow", "A Flow", null, Array.Empty<FlowStep>())
        };
        // Include dummy steps so the flows are non-empty
        var flowsWithSteps = new[]
        {
            new Flow("z-flow", "Z Flow", null, new[] { new FlowStep("svc", null, "step", null) }),
            new Flow("a-flow", "A Flow", null, new[] { new FlowStep("svc", null, "step", null) })
        };

        var snapshot = new ModelSnapshot(
            ElementSource.Git,
            new[] { CreateElement("svc", ElementKind.Service, "Svc") },
            Array.Empty<RelationshipBase>(),
            Flows: flowsWithSteps);

        var obj = SnapshotSerializer.ToJsonObject(snapshot);
        var json = obj.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
        using var doc = JsonDocument.Parse(json);
        var flowsArr = doc.RootElement.GetProperty("flows");

        flowsArr[0].GetProperty("id").GetString().Should().Be("a-flow");
        flowsArr[1].GetProperty("id").GetString().Should().Be("z-flow");
    }

    [Fact]
    public void Normalize_WithFlows_SortsFlowsById()
    {
        var json = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.1.0",
          "source": "Git",
          "elements": [],
          "relationships": [],
          "flows": [
            { "id": "z-flow", "name": "Z", "steps": [] },
            { "id": "a-flow", "name": "A", "steps": [] }
          ]
        }
        """;

        var normalized = SnapshotSerializer.Normalize(json);
        using var doc = JsonDocument.Parse(normalized);
        var flows = doc.RootElement.GetProperty("flows");

        flows[0].GetProperty("id").GetString().Should().Be("a-flow");
        flows[1].GetProperty("id").GetString().Should().Be("z-flow");
    }

    [Fact]
    public void Normalize_WithoutFlows_DoesNotAddFlowsKey()
    {
        var json = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.0.0",
          "source": "CodeScan",
          "elements": [],
          "relationships": []
        }
        """;

        var normalized = SnapshotSerializer.Normalize(json);
        using var doc = JsonDocument.Parse(normalized);
        doc.RootElement.TryGetProperty("flows", out _).Should().BeFalse();
    }

    [Fact]
    public void Normalize_FlowsInCanonicalKeyOrder()
    {
        var json = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.1.0",
          "source": "Git",
          "elements": [{ "id": "svc", "kind": "Service", "name": "S" }],
          "relationships": [],
          "flows": [{ "id": "f1", "name": "F1", "steps": [] }]
        }
        """;

        var normalized = SnapshotSerializer.Normalize(json);
        using var doc = JsonDocument.Parse(normalized);
        var keys = doc.RootElement.EnumerateObject().Select(p => p.Name).ToList();

        keys.Should().ContainInOrder("$schema", "schemaVersion", "source", "elements", "relationships", "flows");
    }

    private static ElementBase CreateElement(string id, ElementKind kind, string name)
    {
        return ElementFactory.Create(
            kind: kind,
            id: new ElementId(id),
            name: name,
            source: ElementSource.Git);
    }

    private static ModelSnapshot CreateSnapshotWithFlows()
    {
        var elements = new[]
        {
            CreateElement("webapp", ElementKind.Service, "Web App"),
            CreateElement("api", ElementKind.Service, "API")
        };

        var relationships = new[]
        {
            RelationshipFactory.Create(
                kind: RelationKind.Calls,
                id: new RelationshipId("webapp--calls-->api"),
                sourceId: new ElementId("webapp"),
                targetId: new ElementId("api"),
                source: ElementSource.Git)
        };

        var flows = new[]
        {
            new Flow("login-flow", "User Login", "Login sequence", new[]
            {
                new FlowStep("webapp", "webapp--calls-->api", "POST /login", null),
                new FlowStep("api", null, "validate input", null)
            })
        };

        return new ModelSnapshot(ElementSource.Git, elements, relationships, flows);
    }

    private static ModelSnapshot CreateSnapshotWithActionStep()
    {
        var elements = new[] { CreateElement("api", ElementKind.Service, "API") };
        var flows = new[]
        {
            new Flow("action-flow", "Action Flow", null, new[]
            {
                new FlowStep("api", null, "validate input", null)
            })
        };

        return new ModelSnapshot(ElementSource.Git, elements, Array.Empty<RelationshipBase>(), flows);
    }
}
