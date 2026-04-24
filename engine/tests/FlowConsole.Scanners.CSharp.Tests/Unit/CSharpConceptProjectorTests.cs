using FlowConsole.Core.Evidence;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Scanners.CSharp;

namespace FlowConsole.Scanners.CSharp.Tests.Unit;

public sealed class CSharpConceptProjectorTests
{
    private static ApplicationBoundary MakeBoundary(
        string name,
        RuntimeCandidateKind kind,
        IReadOnlyList<string>? owned = null,
        IReadOnlyList<string>? shared = null) =>
        new(
            RootProjectName: name,
            RootProjectPath: $"/src/{name}/{name}.csproj",
            RuntimeKind: kind,
            Confidence: Confidence.High,
            OwnedProjects: owned ?? [],
            SharedProjects: shared ?? []);

    private static EvidenceRecord MakeCapability(string subject, string value) =>
        new(
            Subject: subject,
            EvidenceKind: EvidenceKind.Capability,
            EvidenceValue: value,
            Location: null,
            OriginFile: $"/src/{subject}/Controllers/Foo.cs",
            SourceAdapter: "csharp-capability",
            WeightHint: 40);

    private static EvidenceRecord MakeOutbound(string subject, string value) =>
        new(
            Subject: subject,
            EvidenceKind: EvidenceKind.OutboundCommunication,
            EvidenceValue: value,
            Location: null,
            OriginFile: $"/src/{subject}/Startup.cs",
            SourceAdapter: "csharp-outbound",
            WeightHint: 30);

    [Fact]
    public void Project_WebApplication_MapsToService()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("Api", RuntimeCandidateKind.WebApplication),
        };

        var (concepts, _) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>());

        var root = concepts.First(c => c.CanonicalId == "csharp:Api");
        Assert.Equal(ElementKind.Service, root.Kind);
        Assert.Equal("C#/.NET", root.Technology);
    }

    [Fact]
    public void Project_Worker_MapsToWorker()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("BgService", RuntimeCandidateKind.Worker),
        };

        var (concepts, _) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>());

        Assert.Equal(ElementKind.Worker, concepts[0].Kind);
    }

    [Fact]
    public void Project_ConsoleTool_MapsToApplication()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("Cli", RuntimeCandidateKind.ConsoleTool),
        };

        var (concepts, _) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>());

        Assert.Equal(ElementKind.Application, concepts[0].Kind);
    }

    [Fact]
    public void Project_HttpCapability_CreatesApiConceptAndExposesRelation()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("Api", RuntimeCandidateKind.WebApplication),
        };

        var capability = new Dictionary<string, IReadOnlyList<EvidenceRecord>>
        {
            ["Api"] = [MakeCapability("Api", "Capability:HttpApi")],
        };

        var (concepts, relations) = CSharpConceptProjector.Project(
            boundaries, capability,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>());

        var apiConcept = concepts.FirstOrDefault(c => c.Kind == ElementKind.Endpoint);
        Assert.NotNull(apiConcept);
        Assert.Equal("csharp:Api:api", apiConcept.CanonicalId);

        var exposes = relations.FirstOrDefault(r => r.Kind == RelationKind.Exposes);
        Assert.NotNull(exposes);
        Assert.Equal("csharp:Api", exposes.SourceId.Value);
        Assert.Equal("csharp:Api:api", exposes.TargetId.Value);
    }

    [Fact]
    public void Project_ResolvedOutbound_CreatesCallsRelation()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("Gateway", RuntimeCandidateKind.WebApplication),
            MakeBoundary("UserService", RuntimeCandidateKind.WebApplication),
        };

        var outbound = new Dictionary<string, IReadOnlyList<EvidenceRecord>>
        {
            ["Gateway"] = [MakeOutbound("Gateway", "HttpClient:UserService")],
        };

        var (_, relations) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            outbound);

        var calls = relations.FirstOrDefault(r =>
            r.Kind == RelationKind.Calls &&
            r.SourceId.Value == "csharp:Gateway" &&
            r.TargetId.Value == "csharp:UserService");
        Assert.NotNull(calls);
    }

    [Fact]
    public void Project_ExternalHostname_CreatesExternalConceptAndCallsRelation()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("Api", RuntimeCandidateKind.WebApplication),
        };

        var outbound = new Dictionary<string, IReadOnlyList<EvidenceRecord>>
        {
            ["Api"] = [MakeOutbound("Api", "HttpClient:https://api.stripe.com/v1")],
        };

        var (concepts, relations) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            outbound);

        var external = concepts.FirstOrDefault(c => c.Kind == ElementKind.External);
        Assert.NotNull(external);
        Assert.Equal("external:api.stripe.com", external.CanonicalId);

        var calls = relations.FirstOrDefault(r =>
            r.Kind == RelationKind.Calls &&
            r.TargetId.Value == "external:api.stripe.com");
        Assert.NotNull(calls);
    }

    [Fact]
    public void Project_NormalizedInternalTarget_ResolvesCallsRelation()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("WebApp", RuntimeCandidateKind.WebApplication),
            MakeBoundary("Catalog.API", RuntimeCandidateKind.WebApplication),
        };

        var outbound = new Dictionary<string, IReadOnlyList<EvidenceRecord>>
        {
            ["WebApp"] = [MakeOutbound("WebApp", "Outbound:HttpClient:catalog-api")],
        };

        var (_, relations) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            outbound);

        Assert.Contains(relations, relation =>
            relation.Kind == RelationKind.Calls &&
            relation.SourceId.Value == "csharp:WebApp" &&
            relation.TargetId.Value == "csharp:Catalog.API");
    }

    [Fact]
    public void Project_EventBusTarget_CreatesExternalConceptAndCallsRelation()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("Ordering.API", RuntimeCandidateKind.WebApplication),
        };

        var outbound = new Dictionary<string, IReadOnlyList<EvidenceRecord>>
        {
            ["Ordering.API"] = [MakeOutbound("Ordering.API", "Outbound:MessageBus:eventbus")],
        };

        var (concepts, relations) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            outbound);

        Assert.Contains(concepts, concept =>
            concept.Kind == ElementKind.External &&
            concept.CanonicalId == "external:eventbus");
        Assert.Contains(relations, relation =>
            relation.Kind == RelationKind.Calls &&
            relation.SourceId.Value == "csharp:Ordering.API" &&
            relation.TargetId.Value == "external:eventbus");
    }

    [Fact]
    public void Project_IdentityUrl_ResolvesToIdentityApi()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("WebApp", RuntimeCandidateKind.WebApplication),
            MakeBoundary("Identity.API", RuntimeCandidateKind.WebApplication),
        };

        var outbound = new Dictionary<string, IReadOnlyList<EvidenceRecord>>
        {
            ["WebApp"] = [MakeOutbound("WebApp", "Outbound:AuthProvider:IdentityUrl")],
        };

        var (_, relations) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            outbound);

        Assert.Contains(relations, relation =>
            relation.Kind == RelationKind.Calls &&
            relation.SourceId.Value == "csharp:WebApp" &&
            relation.TargetId.Value == "csharp:Identity.API");
    }

    [Fact]
    public void Project_IdentityEndpointBase_ResolvesToIdentityApi()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("ClientApp", RuntimeCandidateKind.Entrypoint),
            MakeBoundary("Identity.API", RuntimeCandidateKind.WebApplication),
        };

        var outbound = new Dictionary<string, IReadOnlyList<EvidenceRecord>>
        {
            ["ClientApp"] = [MakeOutbound("ClientApp", "Outbound:AuthProvider:IdentityEndpointBase")],
        };

        var (_, relations) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            outbound);

        Assert.Contains(relations, relation =>
            relation.Kind == RelationKind.Calls &&
            relation.SourceId.Value == "csharp:ClientApp" &&
            relation.TargetId.Value == "csharp:Identity.API");
    }

    [Fact]
    public void Project_GatewayCatalogEndpointBase_RemainsUnresolved()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("ClientApp", RuntimeCandidateKind.Entrypoint),
            MakeBoundary("Catalog.API", RuntimeCandidateKind.WebApplication),
        };

        var outbound = new Dictionary<string, IReadOnlyList<EvidenceRecord>>
        {
            ["ClientApp"] = [MakeOutbound("ClientApp", "Outbound:HttpClient:GatewayCatalogEndpointBase")],
        };

        var (concepts, relations) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            outbound);

        Assert.DoesNotContain(concepts, concept => concept.Kind == ElementKind.External);
        Assert.DoesNotContain(relations, relation =>
            relation.Kind == RelationKind.Calls &&
            relation.SourceId.Value == "csharp:ClientApp");
    }

    [Fact]
    public void Project_MobileBffHost_RemainsUnresolved()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("HybridApp", RuntimeCandidateKind.Entrypoint),
            MakeBoundary("Catalog.API", RuntimeCandidateKind.WebApplication),
        };

        var outbound = new Dictionary<string, IReadOnlyList<EvidenceRecord>>
        {
            ["HybridApp"] = [MakeOutbound("HybridApp", "Outbound:HttpClient:MobileBffHost")],
        };

        var (concepts, relations) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            outbound);

        Assert.DoesNotContain(concepts, concept => concept.Kind == ElementKind.External);
        Assert.DoesNotContain(relations, relation =>
            relation.Kind == RelationKind.Calls &&
            relation.SourceId.Value == "csharp:HybridApp");
    }

    [Fact]
    public void Project_LoopbackTarget_DoesNotCreateExternalNode()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("HybridApp", RuntimeCandidateKind.Entrypoint),
        };

        var outbound = new Dictionary<string, IReadOnlyList<EvidenceRecord>>
        {
            ["HybridApp"] = [MakeOutbound("HybridApp", "Outbound:HttpClient:http://localhost:11632/")],
        };

        var (concepts, relations) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            outbound);

        Assert.DoesNotContain(concepts, concept => concept.Kind == ElementKind.External);
        Assert.DoesNotContain(relations, relation => relation.Kind == RelationKind.Calls);
    }

    [Fact]
    public void Project_AmbiguousNormalizedTarget_DoesNotCreateRelation()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("Catalog.API", RuntimeCandidateKind.WebApplication),
            MakeBoundary("Catalog_Api", RuntimeCandidateKind.WebApplication),
            MakeBoundary("WebApp", RuntimeCandidateKind.WebApplication),
        };

        var outbound = new Dictionary<string, IReadOnlyList<EvidenceRecord>>
        {
            ["WebApp"] = [MakeOutbound("WebApp", "Outbound:HttpClient:catalog-api")],
        };

        var (_, relations) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            outbound);

        Assert.DoesNotContain(relations, relation =>
            relation.Kind == RelationKind.Calls &&
            relation.SourceId.Value == "csharp:WebApp");
    }

    [Fact]
    public void Project_UnresolvedOutbound_NoRelationCreated()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("Api", RuntimeCandidateKind.WebApplication),
        };

        var outbound = new Dictionary<string, IReadOnlyList<EvidenceRecord>>
        {
            ["Api"] = [MakeOutbound("Api", "MessageBus:OrderCreated")],
        };

        var (concepts, relations) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            outbound);

        // No external concept for non-hostname, non-resolved targets
        Assert.DoesNotContain(concepts, c => c.Kind == ElementKind.External);
        Assert.DoesNotContain(relations, r => r.Kind == RelationKind.Calls);
    }

    [Fact]
    public void Project_OwnedProjects_CreatesContainsRelations()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("Api", RuntimeCandidateKind.WebApplication, owned: ["Core", "Shared"]),
        };

        var (_, relations) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>());

        var containsRelations = relations.Where(r => r.Kind == RelationKind.Contains).ToList();
        Assert.Equal(2, containsRelations.Count);
        Assert.Contains(containsRelations, r => r.TargetId.Value == "csharp:Core");
        Assert.Contains(containsRelations, r => r.TargetId.Value == "csharp:Shared");
    }

    [Fact]
    public void Project_DuplicateExternalHost_CreatedOnce()
    {
        var boundaries = new List<ApplicationBoundary>
        {
            MakeBoundary("Api", RuntimeCandidateKind.WebApplication),
        };

        var outbound = new Dictionary<string, IReadOnlyList<EvidenceRecord>>
        {
            ["Api"] =
            [
                MakeOutbound("Api", "HttpClient:https://redis.example.com/cache"),
                MakeOutbound("Api", "HttpClient:https://redis.example.com/session"),
            ],
        };

        var (concepts, relations) = CSharpConceptProjector.Project(
            boundaries,
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            outbound);

        var externals = concepts.Where(c => c.Kind == ElementKind.External).ToList();
        Assert.Single(externals);

        // Two calls relations to same external
        var calls = relations.Where(r => r.Kind == RelationKind.Calls).ToList();
        Assert.Equal(2, calls.Count);
    }

    [Fact]
    public void Project_EmptyBoundaries_ReturnsEmpty()
    {
        var (concepts, relations) = CSharpConceptProjector.Project(
            [],
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
            new Dictionary<string, IReadOnlyList<EvidenceRecord>>());

        Assert.Empty(concepts);
        Assert.Empty(relations);
    }

    [Fact]
    public void Project_NullBoundaries_Throws()
    {
        Assert.Throws<ArgumentNullException>(() =>
            CSharpConceptProjector.Project(
                null!,
                new Dictionary<string, IReadOnlyList<EvidenceRecord>>(),
                new Dictionary<string, IReadOnlyList<EvidenceRecord>>()));
    }
}
