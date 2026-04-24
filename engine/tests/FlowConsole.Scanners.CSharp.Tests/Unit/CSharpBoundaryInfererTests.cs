using FlowConsole.Core.Evidence;
using FlowConsole.Scanners.CSharp;

namespace FlowConsole.Scanners.CSharp.Tests.Unit;

public sealed class CSharpBoundaryInfererTests
{
    private static ProjectDescriptor MakeProject(
        string name,
        IReadOnlyList<string>? projectReferences = null,
        string sdk = "Microsoft.NET.Sdk",
        bool isTestProject = false) =>
        new(
            Path: $"/src/{name}/{name}.csproj",
            Name: name,
            Sdk: sdk,
            TargetFramework: "net10.0",
            OutputType: null,
            PackageReferences: [],
            ProjectReferences: projectReferences ?? [],
            IsTestProject: isTestProject,
            IsPackable: null);

    private static InferenceResult<RuntimeCandidateKind> MakeInference(
        RuntimeCandidateKind kind,
        Confidence confidence = Confidence.High) =>
        new(kind, confidence, [], null, null);

    [Fact]
    public void Infer_SingleRoot_OwnsTransitiveClosure()
    {
        var projects = new List<ProjectDescriptor>
        {
            MakeProject("Api", ["../Core/Core.csproj"]),
            MakeProject("Core", ["../Shared/Shared.csproj"]),
            MakeProject("Shared"),
        };

        var runtimeResults = new Dictionary<string, InferenceResult<RuntimeCandidateKind>>
        {
            ["Api"] = MakeInference(RuntimeCandidateKind.WebApplication),
            ["Core"] = MakeInference(RuntimeCandidateKind.Library),
            ["Shared"] = MakeInference(RuntimeCandidateKind.Library),
        };

        var boundaries = CSharpBoundaryInferer.Infer(projects, runtimeResults);

        Assert.Single(boundaries);
        var boundary = boundaries[0];
        Assert.Equal("Api", boundary.RootProjectName);
        Assert.Equal(RuntimeCandidateKind.WebApplication, boundary.RuntimeKind);
        Assert.Contains("Core", boundary.OwnedProjects);
        Assert.Contains("Shared", boundary.OwnedProjects);
        Assert.Empty(boundary.SharedProjects);
    }

    [Fact]
    public void Infer_TwoRoots_SharedProjectClassified()
    {
        var projects = new List<ProjectDescriptor>
        {
            MakeProject("Api", ["../Core/Core.csproj"]),
            MakeProject("Worker", ["../Core/Core.csproj"]),
            MakeProject("Core"),
        };

        var runtimeResults = new Dictionary<string, InferenceResult<RuntimeCandidateKind>>
        {
            ["Api"] = MakeInference(RuntimeCandidateKind.WebApplication),
            ["Worker"] = MakeInference(RuntimeCandidateKind.Worker),
            ["Core"] = MakeInference(RuntimeCandidateKind.Library),
        };

        var boundaries = CSharpBoundaryInferer.Infer(projects, runtimeResults);

        Assert.Equal(2, boundaries.Count);

        var apiBoundary = boundaries.First(b => b.RootProjectName == "Api");
        var workerBoundary = boundaries.First(b => b.RootProjectName == "Worker");

        // Core is shared between both roots
        Assert.Contains("Core", apiBoundary.SharedProjects);
        Assert.Contains("Core", workerBoundary.SharedProjects);
        Assert.Empty(apiBoundary.OwnedProjects);
        Assert.Empty(workerBoundary.OwnedProjects);
    }

    [Fact]
    public void Infer_OtherRuntimeRoot_ExcludedFromClosure()
    {
        // Api references Worker, but Worker is a runtime root so it's excluded
        var projects = new List<ProjectDescriptor>
        {
            MakeProject("Api", ["../Worker/Worker.csproj", "../Core/Core.csproj"]),
            MakeProject("Worker", ["../Core/Core.csproj"]),
            MakeProject("Core"),
        };

        var runtimeResults = new Dictionary<string, InferenceResult<RuntimeCandidateKind>>
        {
            ["Api"] = MakeInference(RuntimeCandidateKind.WebApplication),
            ["Worker"] = MakeInference(RuntimeCandidateKind.Worker),
            ["Core"] = MakeInference(RuntimeCandidateKind.Library),
        };

        var boundaries = CSharpBoundaryInferer.Infer(projects, runtimeResults);

        var apiBoundary = boundaries.First(b => b.RootProjectName == "Api");
        // Worker should NOT be in Api's closure (it's another runtime root)
        Assert.DoesNotContain("Worker", apiBoundary.OwnedProjects);
        Assert.DoesNotContain("Worker", apiBoundary.SharedProjects);
    }

    [Fact]
    public void Infer_TestProjects_NotRuntimeRoots()
    {
        var projects = new List<ProjectDescriptor>
        {
            MakeProject("Api"),
            MakeProject("ApiTests", isTestProject: true),
        };

        var runtimeResults = new Dictionary<string, InferenceResult<RuntimeCandidateKind>>
        {
            ["Api"] = MakeInference(RuntimeCandidateKind.WebApplication),
            ["ApiTests"] = MakeInference(RuntimeCandidateKind.TestProject),
        };

        var boundaries = CSharpBoundaryInferer.Infer(projects, runtimeResults);

        Assert.Single(boundaries);
        Assert.Equal("Api", boundaries[0].RootProjectName);
    }

    [Fact]
    public void Infer_AppHostProjects_NotRuntimeRoots()
    {
        var projects = new List<ProjectDescriptor>
        {
            MakeProject("Api"),
            MakeProject("eShop.AppHost", sdk: "Aspire.AppHost.Sdk/13.0.0"),
        };

        var runtimeResults = new Dictionary<string, InferenceResult<RuntimeCandidateKind>>
        {
            ["Api"] = MakeInference(RuntimeCandidateKind.WebApplication),
            ["eShop.AppHost"] = MakeInference(RuntimeCandidateKind.Entrypoint),
        };

        var boundaries = CSharpBoundaryInferer.Infer(projects, runtimeResults);

        Assert.Single(boundaries);
        Assert.Equal("Api", boundaries[0].RootProjectName);
    }

    [Fact]
    public void Infer_LibrariesOnly_NoBoundaries()
    {
        var projects = new List<ProjectDescriptor>
        {
            MakeProject("Core"),
            MakeProject("Shared"),
        };

        var runtimeResults = new Dictionary<string, InferenceResult<RuntimeCandidateKind>>
        {
            ["Core"] = MakeInference(RuntimeCandidateKind.Library),
            ["Shared"] = MakeInference(RuntimeCandidateKind.Library),
        };

        var boundaries = CSharpBoundaryInferer.Infer(projects, runtimeResults);

        Assert.Empty(boundaries);
    }

    [Fact]
    public void Infer_EmptyInput_ReturnsEmpty()
    {
        var boundaries = CSharpBoundaryInferer.Infer(
            [],
            new Dictionary<string, InferenceResult<RuntimeCandidateKind>>());

        Assert.Empty(boundaries);
    }

    [Fact]
    public void Infer_NullProjects_Throws()
    {
        Assert.Throws<ArgumentNullException>(() =>
            CSharpBoundaryInferer.Infer(null!, new Dictionary<string, InferenceResult<RuntimeCandidateKind>>()));
    }

    [Fact]
    public void Infer_NullRuntimeResults_Throws()
    {
        Assert.Throws<ArgumentNullException>(() =>
            CSharpBoundaryInferer.Infer([], null!));
    }
}
