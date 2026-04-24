using FlowConsole.Core.Evidence;
using FlowConsole.Scanners.CSharp;

namespace FlowConsole.Scanners.CSharp.Tests.Unit;

public sealed class CSharpRuntimeInfererTests
{
    private static ProjectDescriptor MakeProject(
        string name = "TestApp",
        string? sdk = null,
        string? outputType = null,
        bool isTestProject = false) =>
        new(
            Path: $"/src/{name}/{name}.csproj",
            Name: name,
            Sdk: sdk,
            TargetFramework: "net10.0",
            OutputType: outputType,
            PackageReferences: [],
            ProjectReferences: [],
            IsTestProject: isTestProject,
            IsPackable: null);

    private static EvidenceRecord MakeRuntimeEvidence(string subject, string candidateKind, int weight) =>
        new(
            Subject: subject,
            EvidenceKind: EvidenceKind.RuntimeCandidate,
            EvidenceValue: $"RuntimeCandidate:{candidateKind}",
            Location: null,
            OriginFile: $"/src/{subject}/Program.cs",
            SourceAdapter: "csharp-runtime",
            WeightHint: weight);

    [Fact]
    public void Infer_TestProject_ReturnsTestProjectWithHighConfidence()
    {
        var project = MakeProject("Tests", isTestProject: true);
        var evidence = new List<EvidenceRecord>
        {
            MakeRuntimeEvidence("Tests", "TestProject", 100),
        };

        var result = CSharpRuntimeInferer.Infer(project, evidence);

        Assert.Equal(RuntimeCandidateKind.TestProject, result.SelectedValue);
        Assert.Equal(Confidence.High, result.Confidence);
    }

    [Fact]
    public void Infer_WebSdk_FavorsWebApplication()
    {
        var project = MakeProject("Api", sdk: "Microsoft.NET.Sdk.Web");
        var evidence = new List<EvidenceRecord>
        {
            MakeRuntimeEvidence("Api", "WebApplication", 50),
        };

        var result = CSharpRuntimeInferer.Infer(project, evidence);

        Assert.Equal(RuntimeCandidateKind.WebApplication, result.SelectedValue);
        // 50 (evidence) + 40 (Web SDK bonus) = 90, well above 2x threshold (40)
        Assert.Equal(Confidence.High, result.Confidence);
    }

    [Fact]
    public void Infer_ExeOutputType_InfersEntrypoint()
    {
        var project = MakeProject("Cli", outputType: "Exe");
        var evidence = new List<EvidenceRecord>
        {
            MakeRuntimeEvidence("Cli", "ConsoleTool", 15),
            MakeRuntimeEvidence("Cli", "Entrypoint", 10),
        };

        var result = CSharpRuntimeInferer.Infer(project, evidence);

        Assert.Equal(RuntimeCandidateKind.Entrypoint, result.SelectedValue);
    }

    [Fact]
    public void Infer_ExeOutputType_WithoutOtherEvidence_ReturnsEntrypoint()
    {
        var project = MakeProject("Cli", outputType: "Exe");

        var result = CSharpRuntimeInferer.Infer(project, []);

        Assert.Equal(RuntimeCandidateKind.Entrypoint, result.SelectedValue);
        Assert.Equal(Confidence.Low, result.Confidence);
    }

    [Fact]
    public void Infer_LibraryOutputType_BoostsLibrary()
    {
        var project = MakeProject("Core", outputType: "Library");
        var evidence = new List<EvidenceRecord>();

        var result = CSharpRuntimeInferer.Infer(project, evidence);

        // Library gets +20 from OutputType bonus, meets threshold 20
        Assert.Equal(RuntimeCandidateKind.Library, result.SelectedValue);
    }

    [Fact]
    public void Infer_NoEvidence_DefaultsToLibraryWithLowConfidence()
    {
        var project = MakeProject("Unknown");
        var evidence = new List<EvidenceRecord>();

        var result = CSharpRuntimeInferer.Infer(project, evidence);

        Assert.Equal(RuntimeCandidateKind.Library, result.SelectedValue);
        Assert.Equal(Confidence.Low, result.Confidence);
        Assert.Contains("Unresolved", result.Diagnostics!);
    }

    [Fact]
    public void Infer_WorkerEvidence_ReturnsWorker()
    {
        var project = MakeProject("BgService", sdk: "Microsoft.NET.Sdk.Worker");
        var evidence = new List<EvidenceRecord>
        {
            MakeRuntimeEvidence("BgService", "Worker", 30),
        };

        var result = CSharpRuntimeInferer.Infer(project, evidence);

        Assert.Equal(RuntimeCandidateKind.Worker, result.SelectedValue);
    }

    [Fact]
    public void Infer_MixedEvidence_PicksHighestScore()
    {
        var project = MakeProject("Api", sdk: "Microsoft.NET.Sdk.Web");
        var evidence = new List<EvidenceRecord>
        {
            MakeRuntimeEvidence("Api", "WebApplication", 50),
            MakeRuntimeEvidence("Api", "Worker", 20),
        };

        var result = CSharpRuntimeInferer.Infer(project, evidence);

        // WebApplication: 50 + 40 (SDK bonus) = 90 vs Worker: 20
        Assert.Equal(RuntimeCandidateKind.WebApplication, result.SelectedValue);
        Assert.NotNull(result.RejectedAlternatives);
        Assert.Contains(RuntimeCandidateKind.Worker, result.RejectedAlternatives);
    }

    [Fact]
    public void Infer_NullProject_Throws()
    {
        Assert.Throws<ArgumentNullException>(() =>
            CSharpRuntimeInferer.Infer(null!, []));
    }

    [Fact]
    public void Infer_NullEvidence_Throws()
    {
        Assert.Throws<ArgumentNullException>(() =>
            CSharpRuntimeInferer.Infer(MakeProject(), null!));
    }
}
