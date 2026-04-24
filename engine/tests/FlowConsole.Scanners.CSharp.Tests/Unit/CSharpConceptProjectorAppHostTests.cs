using FlowConsole.Core.Evidence;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Scanners.CSharp;

namespace FlowConsole.Scanners.CSharp.Tests.Unit;

public sealed class CSharpConceptProjectorAppHostTests
{
    private static ApplicationBoundary MakeBoundary(
        string name,
        RuntimeCandidateKind kind) =>
        new(
            RootProjectName: name,
            RootProjectPath: $"/src/{name}/{name}.csproj",
            RuntimeKind: kind,
            Confidence: Confidence.High,
            OwnedProjects: [],
            SharedProjects: []);

    private static EvidenceRecord MakeOutbound(string subject, string value) =>
        new(
            Subject: subject,
            EvidenceKind: EvidenceKind.OutboundCommunication,
            EvidenceValue: value,
            Location: null,
            OriginFile: $"/src/{subject}/Program.cs",
            SourceAdapter: "csharp-outbound",
            WeightHint: 20);

    [Fact]
    public void Project_AppHostGatewayResolution_CreatesGatewayConcept_And_PrefersGatewayHop()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("HybridApp", RuntimeCandidateKind.Entrypoint),
            MakeBoundary("Catalog.API", RuntimeCandidateKind.WebApplication),
            MakeBoundary("Identity.API", RuntimeCandidateKind.WebApplication),
        };

        var outbound = new Dictionary<string, IReadOnlyList<EvidenceRecord>>
        {
            ["HybridApp"] = [MakeOutbound("HybridApp", "Outbound:HttpClient:MobileBffHost")],
        };

        var topology = new AspireTopologyModel(
            Resources:
            [
                new AspireResourceDescriptor(
                    ResourceId: "csharp:mobile-bff",
                    ResourceKind: AspireResourceKind.Gateway,
                    Name: "mobile-bff",
                    SourceProjectName: "AppHost",
                    SourceFile: "Program.cs",
                    Confidence: Confidence.High,
                    Properties: new Dictionary<string, string> { ["resourceName"] = "mobile-bff" }),
                new AspireResourceDescriptor(
                    ResourceId: "csharp:Catalog.API",
                    ResourceKind: AspireResourceKind.Project,
                    Name: "Catalog.API",
                    SourceProjectName: "AppHost",
                    SourceFile: "Program.cs",
                    Confidence: Confidence.High,
                    Properties: new Dictionary<string, string>
                    {
                        ["resourceName"] = "catalog-api",
                        ["projectName"] = "Catalog.API",
                    }),
                new AspireResourceDescriptor(
                    ResourceId: "csharp:Identity.API",
                    ResourceKind: AspireResourceKind.Project,
                    Name: "Identity.API",
                    SourceProjectName: "AppHost",
                    SourceFile: "Program.cs",
                    Confidence: Confidence.High,
                    Properties: new Dictionary<string, string>
                    {
                        ["resourceName"] = "identity-api",
                        ["projectName"] = "Identity.API",
                    }),
            ],
            Links:
            [
                new AspireTopologyLinkDescriptor(
                    SourceResourceId: "csharp:mobile-bff",
                    TargetResourceId: "csharp:Catalog.API",
                    LinkKind: AspireLinkKind.Calls,
                    EvidenceLabel: "Route:ConfigureMobileBffRoutes",
                    Confidence: Confidence.High),
                new AspireTopologyLinkDescriptor(
                    SourceResourceId: "csharp:mobile-bff",
                    TargetResourceId: "csharp:Identity.API",
                    LinkKind: AspireLinkKind.Calls,
                    EvidenceLabel: "Route:ConfigureMobileBffRoutes",
                    Confidence: Confidence.High),
            ]);

        var (concepts, relations) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            outbound,
            topology);

        Assert.Contains(concepts, concept =>
            concept.CanonicalId == "csharp:mobile-bff" &&
            concept.Kind == ElementKind.Gateway);

        Assert.Contains(relations, relation =>
            relation.Kind == RelationKind.Calls &&
            relation.SourceId.Value == "csharp:HybridApp" &&
            relation.TargetId.Value == "csharp:mobile-bff");
        Assert.Contains(relations, relation =>
            relation.Kind == RelationKind.Calls &&
            relation.SourceId.Value == "csharp:mobile-bff" &&
            relation.TargetId.Value == "csharp:Catalog.API");
        Assert.DoesNotContain(relations, relation =>
            relation.Kind == RelationKind.Calls &&
            relation.SourceId.Value == "csharp:HybridApp" &&
            relation.TargetId.Value == "csharp:Catalog.API");
    }

    [Fact]
    public void Project_AppHostResources_MapToExplicitArchTypes()
    {
        var topology = new AspireTopologyModel(
            Resources:
            [
                new AspireResourceDescriptor("csharp:mobile-bff", AspireResourceKind.Gateway, "mobile-bff", "AppHost", "Program.cs", Confidence.High, new Dictionary<string, string>()),
                new AspireResourceDescriptor("csharp:catalogdb", AspireResourceKind.Database, "catalogdb", "AppHost", "Program.cs", Confidence.High, new Dictionary<string, string>()),
                new AspireResourceDescriptor("csharp:redis", AspireResourceKind.Cache, "redis", "AppHost", "Program.cs", Confidence.High, new Dictionary<string, string>()),
                new AspireResourceDescriptor("csharp:eventbus", AspireResourceKind.Broker, "eventbus", "AppHost", "Program.cs", Confidence.High, new Dictionary<string, string>()),
            ],
            Links: []);

        var (concepts, _) = CSharpConceptProjector.Project(
            [],
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            topology);

        Assert.Contains(concepts, concept => concept.CanonicalId == "csharp:mobile-bff" && concept.Kind == ElementKind.Gateway);
        Assert.Contains(concepts, concept => concept.CanonicalId == "csharp:catalogdb" && concept.Kind == ElementKind.Database);
        Assert.Contains(concepts, concept => concept.CanonicalId == "csharp:redis" && concept.Kind == ElementKind.Cache);
        Assert.Contains(concepts, concept => concept.CanonicalId == "csharp:eventbus" && concept.Kind == ElementKind.Broker);
    }
}
