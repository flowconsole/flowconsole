using FlowConsole.Core.Evidence;
using FlowConsole.Scanners.CSharp;

namespace FlowConsole.Scanners.CSharp.Tests.Unit;

public sealed class AspireAppHostEvidenceCollectorTests : IDisposable
{
    private readonly string _tempDir;

    public AspireAppHostEvidenceCollectorTests()
    {
        _tempDir = Directory.CreateTempSubdirectory("aspire_apphost_tests_").FullName;
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, true);
    }

    [Fact]
    public void IsSupportedAppHostProject_ReturnsFalse_ForTestAspireHost()
    {
        var project = new ProjectDescriptor(
            Path: "/tests/Catalog.FunctionalTests/Catalog.FunctionalTests.csproj",
            Name: "Catalog.FunctionalTests",
            Sdk: "Aspire.AppHost.Sdk/13.0.0",
            TargetFramework: "net10.0",
            OutputType: "Exe",
            PackageReferences: ["xunit.v3.mtp-v2", "Aspire.Hosting.PostgreSQL"],
            ProjectReferences: [],
            IsTestProject: true,
            IsPackable: false);

        Assert.False(AspireAppHostEvidenceCollector.IsSupportedAppHostProject(project));
    }

    [Fact]
    public void Collect_Extracts_Gateway_Infra_And_RouteTargets_And_SkipsDisabledBranches()
    {
        var appHostDir = Path.Combine(_tempDir, "AppHost");
        Directory.CreateDirectory(appHostDir);

        File.WriteAllText(Path.Combine(appHostDir, "Program.cs"), """
            var builder = DistributedApplication.CreateBuilder(args);

            var redis = builder.AddRedis("redis");
            var postgres = builder.AddPostgres("postgres");
            var catalogDb = postgres.AddDatabase("catalogdb");
            var identityApi = builder.AddProject<Projects.Identity_API>("identity-api")
                .WithReference(catalogDb);

            builder.AddYarp("mobile-bff")
                .ConfigureMobileBffRoutes(identityApi);

            bool useOpenAI = false;
            if (useOpenAI)
            {
                builder.AddYarp("ignored-gateway");
            }
            """);

        File.WriteAllText(Path.Combine(appHostDir, "Extensions.cs"), """
            public static class Extensions
            {
                public static IResourceBuilder<YarpResource> ConfigureMobileBffRoutes(this IResourceBuilder<YarpResource> builder,
                    IResourceBuilder<ProjectResource> identityApi)
                {
                    return builder.WithConfiguration(yarp =>
                    {
                        yarp.AddRoute("/identity/{*any}", identityApi.GetEndpoint("http"));
                    });
                }
            }
            """);

        var appHostProject = new ProjectDescriptor(
            Path: Path.Combine(appHostDir, "AppHost.csproj"),
            Name: "AppHost",
            Sdk: "Aspire.AppHost.Sdk/13.0.0",
            TargetFramework: "net10.0",
            OutputType: "Exe",
            PackageReferences: ["Aspire.Hosting.Yarp", "Aspire.Hosting.Redis", "Aspire.Hosting.PostgreSQL"],
            ProjectReferences: [],
            IsTestProject: false,
            IsPackable: false);

        var identityProject = new ProjectDescriptor(
            Path: Path.Combine(_tempDir, "Identity.API", "Identity.API.csproj"),
            Name: "Identity.API",
            Sdk: "Microsoft.NET.Sdk.Web",
            TargetFramework: "net10.0",
            OutputType: "Exe",
            PackageReferences: [],
            ProjectReferences: [],
            IsTestProject: false,
            IsPackable: false);

        var topology = AspireAppHostEvidenceCollector.Collect(appHostDir, appHostProject, [appHostProject, identityProject]);

        Assert.Contains(topology.Resources, resource =>
            resource.ResourceKind == AspireResourceKind.Gateway &&
            resource.ResourceId == "csharp:mobile-bff");
        Assert.Contains(topology.Resources, resource =>
            resource.ResourceKind == AspireResourceKind.Cache &&
            resource.ResourceId == "csharp:redis");
        Assert.Contains(topology.Resources, resource =>
            resource.ResourceKind == AspireResourceKind.Database &&
            resource.ResourceId == "csharp:catalogdb");
        Assert.DoesNotContain(topology.Resources, resource =>
            string.Equals(resource.ResourceId, "csharp:ignored-gateway", StringComparison.Ordinal));

        Assert.Contains(topology.Links, link =>
            link.LinkKind == AspireLinkKind.DependsOn &&
            link.SourceResourceId == "csharp:Identity.API" &&
            link.TargetResourceId == "csharp:catalogdb");
        Assert.Contains(topology.Links, link =>
            link.LinkKind == AspireLinkKind.Calls &&
            link.SourceResourceId == "csharp:mobile-bff" &&
            link.TargetResourceId == "csharp:Identity.API");
    }
}
