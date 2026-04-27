using System.Text.Json;
using FlowConsole.Cli.Synth;

namespace FlowConsole.Cli.Tests.Synth;

public sealed class FlowDiffRendererTests
{
    [Fact]
    public void ComputeDiff_BothEmpty_ReturnsEmptyDiff()
    {
        using var local = JsonDocument.Parse("""{ "elements": [], "relationships": [] }""");
        using var remote = JsonDocument.Parse("""{ "elements": [], "relationships": [] }""");

        var diff = FlowDiffRenderer.ComputeDiff(local, remote);

        FlowDiffRenderer.IsEmpty(diff).Should().BeTrue();
    }

    [Fact]
    public void ComputeDiff_FlowAddedLocally_ShowsAdded()
    {
        using var local = JsonDocument.Parse("""
            {
              "flows": [
                { "id": "f1", "name": "Flow 1", "steps": [{ "sourceElementId": "a" }] }
              ]
            }
            """);
        using var remote = JsonDocument.Parse("""{ "elements": [] }""");

        var diff = FlowDiffRenderer.ComputeDiff(local, remote);

        diff.Added.Should().HaveCount(1);
        diff.Added[0].Id.Should().Be("f1");
        diff.Removed.Should().BeEmpty();
        diff.Changed.Should().BeEmpty();
    }

    [Fact]
    public void ComputeDiff_FlowRemovedLocally_ShowsRemoved()
    {
        using var local = JsonDocument.Parse("""{ "elements": [] }""");
        using var remote = JsonDocument.Parse("""
            {
              "flows": [
                { "id": "f1", "name": "Flow 1", "steps": [{ "sourceElementId": "a" }] }
              ]
            }
            """);

        var diff = FlowDiffRenderer.ComputeDiff(local, remote);

        diff.Removed.Should().HaveCount(1);
        diff.Removed[0].Id.Should().Be("f1");
        diff.Added.Should().BeEmpty();
        diff.Changed.Should().BeEmpty();
    }

    [Fact]
    public void ComputeDiff_FlowStepChanged_ShowsChanged()
    {
        using var local = JsonDocument.Parse("""
            {
              "flows": [
                { "id": "f1", "name": "Flow 1", "steps": [
                  { "sourceElementId": "a", "label": "new label" }
                ] }
              ]
            }
            """);
        using var remote = JsonDocument.Parse("""
            {
              "flows": [
                { "id": "f1", "name": "Flow 1", "steps": [
                  { "sourceElementId": "a", "label": "old label" }
                ] }
              ]
            }
            """);

        var diff = FlowDiffRenderer.ComputeDiff(local, remote);

        diff.Changed.Should().HaveCount(1);
        diff.Changed[0].Before.Steps[0].Label.Should().Be("old label");
        diff.Changed[0].After.Steps[0].Label.Should().Be("new label");
        diff.Added.Should().BeEmpty();
        diff.Removed.Should().BeEmpty();
    }

    [Fact]
    public void ComputeDiff_StepReordered_ShowsChanged()
    {
        using var local = JsonDocument.Parse("""
            {
              "flows": [
                { "id": "f1", "name": "F", "steps": [
                  { "sourceElementId": "b" },
                  { "sourceElementId": "a" }
                ] }
              ]
            }
            """);
        using var remote = JsonDocument.Parse("""
            {
              "flows": [
                { "id": "f1", "name": "F", "steps": [
                  { "sourceElementId": "a" },
                  { "sourceElementId": "b" }
                ] }
              ]
            }
            """);

        var diff = FlowDiffRenderer.ComputeDiff(local, remote);

        diff.Changed.Should().HaveCount(1);
    }

    [Fact]
    public void ComputeDiff_StepCountDiffers_ShowsChanged()
    {
        using var local = JsonDocument.Parse("""
            {
              "flows": [
                { "id": "f1", "name": "F", "steps": [
                  { "sourceElementId": "a" },
                  { "sourceElementId": "b" },
                  { "sourceElementId": "c" }
                ] }
              ]
            }
            """);
        using var remote = JsonDocument.Parse("""
            {
              "flows": [
                { "id": "f1", "name": "F", "steps": [
                  { "sourceElementId": "a" }
                ] }
              ]
            }
            """);

        var diff = FlowDiffRenderer.ComputeDiff(local, remote);

        diff.Changed.Should().HaveCount(1);
    }

    [Fact]
    public void Render_EmptyDiff_OutputsNoChanges()
    {
        var diff = new FlowDiff([], [], []);
        var writer = new StringWriter();

        FlowDiffRenderer.Render(diff, writer);

        writer.ToString().Should().Contain("no changes");
    }

    [Fact]
    public void Render_AddedFlow_OutputsPlusPrefix()
    {
        var flow = new FlowSummary("f1", "Login", [new StepSummary("webapp", "webapp--calls-->api", "POST /login")]);
        var diff = new FlowDiff([flow], [], []);
        var writer = new StringWriter();

        FlowDiffRenderer.Render(diff, writer);

        var output = writer.ToString();
        output.Should().Contain("+ flow");
        output.Should().Contain("Login");
        output.Should().Contain("+1 added");
    }

    [Fact]
    public void Render_RemovedFlow_OutputsMinusPrefix()
    {
        var flow = new FlowSummary("f1", "Removed", [new StepSummary("a", null, "action")]);
        var diff = new FlowDiff([], [flow], []);
        var writer = new StringWriter();

        FlowDiffRenderer.Render(diff, writer);

        var output = writer.ToString();
        output.Should().Contain("- flow");
        output.Should().Contain("Removed");
        output.Should().Contain("-1 removed");
    }

    [Fact]
    public void Render_ChangedFlow_OutputsTildePrefix()
    {
        var before = new FlowSummary("f1", "F", [new StepSummary("a", null, "old")]);
        var after = new FlowSummary("f1", "F", [new StepSummary("a", null, "new")]);
        var diff = new FlowDiff([], [], [(before, after)]);
        var writer = new StringWriter();

        FlowDiffRenderer.Render(diff, writer);

        var output = writer.ToString();
        output.Should().Contain("~ flow");
        output.Should().Contain("~1 changed");
    }

    [Fact]
    public void Render_ActionStep_ShowsActionLabel()
    {
        var flow = new FlowSummary("f1", "F", [new StepSummary("svc", null, "validate input")]);
        var diff = new FlowDiff([flow], [], []);
        var writer = new StringWriter();

        FlowDiffRenderer.Render(diff, writer);

        writer.ToString().Should().Contain("(action)");
    }

    [Fact]
    public void Render_EdgeStep_ShowsRelationshipId()
    {
        var flow = new FlowSummary("f1", "F", [new StepSummary("a", "a--calls-->b", "request")]);
        var diff = new FlowDiff([flow], [], []);
        var writer = new StringWriter();

        FlowDiffRenderer.Render(diff, writer);

        writer.ToString().Should().Contain("a--calls-->b");
    }
}
