using FlowConsole.Core.Evidence;
using FlowConsole.Scanners.CSharp;

namespace FlowConsole.Scanners.CSharp.Tests.Unit;

public sealed class CSharpEvidenceCollectorTests : IDisposable
{
    private readonly string _tempDir;

    public CSharpEvidenceCollectorTests()
    {
        _tempDir = Directory.CreateTempSubdirectory("evidence_test_").FullName;
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, true);
    }

    // === CSharpMetadataEvidenceCollector ===

    [Fact]
    public void Metadata_Collect_EmitsSdkEvidence()
    {
        var project = new ProjectDescriptor(
            Path: "/src/Api.csproj", Name: "Api",
            Sdk: "Microsoft.NET.Sdk.Web", TargetFramework: "net10.0",
            OutputType: null, PackageReferences: [], ProjectReferences: [],
            IsTestProject: false, IsPackable: null);

        var evidence = CSharpMetadataEvidenceCollector.Collect(project);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.ProjectDescriptor &&
            e.EvidenceValue == "Sdk:Microsoft.NET.Sdk.Web");
    }

    [Fact]
    public void Metadata_Collect_EmitsOutputTypeEvidence()
    {
        var project = new ProjectDescriptor(
            Path: "/src/Console.csproj", Name: "Console",
            Sdk: "Microsoft.NET.Sdk", TargetFramework: "net10.0",
            OutputType: "Exe", PackageReferences: [], ProjectReferences: [],
            IsTestProject: false, IsPackable: null);

        var evidence = CSharpMetadataEvidenceCollector.Collect(project);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.ProjectDescriptor &&
            e.EvidenceValue == "OutputType:Exe");
    }

    [Fact]
    public void Metadata_Collect_EmitsTargetFrameworkEvidence()
    {
        var project = new ProjectDescriptor(
            Path: "/src/Api.csproj", Name: "Api",
            Sdk: "Microsoft.NET.Sdk.Web", TargetFramework: "net10.0",
            OutputType: null, PackageReferences: [], ProjectReferences: [],
            IsTestProject: false, IsPackable: null);

        var evidence = CSharpMetadataEvidenceCollector.Collect(project);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.ProjectDescriptor &&
            e.EvidenceValue == "TargetFramework:net10.0");
    }

    [Fact]
    public void Metadata_Collect_EmitsPackageReferenceEvidence()
    {
        var project = new ProjectDescriptor(
            Path: "/src/Api.csproj", Name: "Api",
            Sdk: "Microsoft.NET.Sdk.Web", TargetFramework: "net10.0",
            OutputType: null,
            PackageReferences: ["Serilog", "MediatR"],
            ProjectReferences: [],
            IsTestProject: false, IsPackable: null);

        var evidence = CSharpMetadataEvidenceCollector.Collect(project);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.ProjectDependency &&
            e.EvidenceValue == "PackageReference:Serilog");
        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.ProjectDependency &&
            e.EvidenceValue == "PackageReference:MediatR");
    }

    [Fact]
    public void Metadata_Collect_EmitsProjectReferenceEvidence()
    {
        var project = new ProjectDescriptor(
            Path: "/src/Api.csproj", Name: "Api",
            Sdk: "Microsoft.NET.Sdk.Web", TargetFramework: "net10.0",
            OutputType: null,
            PackageReferences: [],
            ProjectReferences: ["../Core/Core.csproj"],
            IsTestProject: false, IsPackable: null);

        var evidence = CSharpMetadataEvidenceCollector.Collect(project);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.ProjectDependency &&
            e.EvidenceValue == "ProjectReference:../Core/Core.csproj");
    }

    [Fact]
    public void Metadata_Collect_TestProject_EmitsRuntimeCandidateWithWeight100()
    {
        var project = new ProjectDescriptor(
            Path: "/tests/Tests.csproj", Name: "Tests",
            Sdk: "Microsoft.NET.Sdk", TargetFramework: "net10.0",
            OutputType: null, PackageReferences: ["xunit"],
            ProjectReferences: [],
            IsTestProject: true, IsPackable: null);

        var evidence = CSharpMetadataEvidenceCollector.Collect(project);

        var testEvidence = Assert.Single(evidence,
            e => e.EvidenceKind == EvidenceKind.RuntimeCandidate);
        Assert.Equal("RuntimeCandidate:TestProject", testEvidence.EvidenceValue);
        Assert.Equal(100, testEvidence.WeightHint);
    }

    [Fact]
    public void Metadata_Collect_NonTestProject_NoRuntimeCandidate()
    {
        var project = new ProjectDescriptor(
            Path: "/src/Lib.csproj", Name: "Lib",
            Sdk: "Microsoft.NET.Sdk", TargetFramework: "net10.0",
            OutputType: null, PackageReferences: [],
            ProjectReferences: [],
            IsTestProject: false, IsPackable: null);

        var evidence = CSharpMetadataEvidenceCollector.Collect(project);

        Assert.DoesNotContain(evidence, e => e.EvidenceKind == EvidenceKind.RuntimeCandidate);
    }

    [Fact]
    public void Metadata_Collect_SubjectIsProjectName()
    {
        var project = new ProjectDescriptor(
            Path: "/src/MyApi.csproj", Name: "MyApi",
            Sdk: "Microsoft.NET.Sdk.Web", TargetFramework: "net10.0",
            OutputType: null, PackageReferences: [], ProjectReferences: [],
            IsTestProject: false, IsPackable: null);

        var evidence = CSharpMetadataEvidenceCollector.Collect(project);

        Assert.All(evidence, e => Assert.Equal("MyApi", e.Subject));
    }

    // === CSharpRuntimeEvidenceCollector ===

    [Fact]
    public void Runtime_Collect_WebApplicationCreateBuilder()
    {
        var projectDir = CreateProjectDir("WebApp");
        WriteCsFile(projectDir, "Program.cs", """
            var builder = WebApplication.CreateBuilder(args);
            var app = builder.Build();
            app.MapGet("/", () => "Hello");
            app.Run();
            """);

        var project = MakeDescriptor("WebApp");
        var evidence = CSharpRuntimeEvidenceCollector.Collect(projectDir, project);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.RuntimeCandidate &&
            e.EvidenceValue == "RuntimeCandidate:WebApplication" &&
            e.WeightHint == 50);
    }

    [Fact]
    public void Runtime_Collect_HostCreateDefaultBuilder()
    {
        var projectDir = CreateProjectDir("Worker");
        WriteCsFile(projectDir, "Program.cs", """
            using Microsoft.Extensions.Hosting;
            var host = Host.CreateDefaultBuilder(args)
                .ConfigureServices(services => { })
                .Build();
            host.Run();
            """);

        var project = MakeDescriptor("Worker");
        var evidence = CSharpRuntimeEvidenceCollector.Collect(projectDir, project);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.RuntimeCandidate &&
            e.EvidenceValue == "RuntimeCandidate:Worker" &&
            e.WeightHint == 30);
    }

    [Fact]
    public void Runtime_Collect_AddHostedService()
    {
        var projectDir = CreateProjectDir("Svc");
        WriteCsFile(projectDir, "Startup.cs", """
            public class Startup
            {
                public void ConfigureServices(IServiceCollection services)
                {
                    services.AddHostedService<MyWorker>();
                }
            }
            """);

        var project = MakeDescriptor("Svc");
        var evidence = CSharpRuntimeEvidenceCollector.Collect(projectDir, project);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.RuntimeCandidate &&
            e.EvidenceValue == "RuntimeCandidate:Worker" &&
            e.WeightHint == 20);
    }

    [Fact]
    public void Runtime_Collect_MapControllers_EmitsHttpApiCapability()
    {
        var projectDir = CreateProjectDir("Api");
        WriteCsFile(projectDir, "Program.cs", """
            var builder = WebApplication.CreateBuilder(args);
            builder.Services.AddControllers();
            var app = builder.Build();
            app.MapControllers();
            app.Run();
            """);

        var project = MakeDescriptor("Api");
        var evidence = CSharpRuntimeEvidenceCollector.Collect(projectDir, project);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.Capability &&
            e.EvidenceValue == "Capability:HttpApi" &&
            e.WeightHint == 30);
    }

    [Fact]
    public void Runtime_Collect_MapGrpcService_EmitsGrpcCapability()
    {
        var projectDir = CreateProjectDir("Grpc");
        WriteCsFile(projectDir, "Program.cs", """
            var builder = WebApplication.CreateBuilder(args);
            builder.Services.AddGrpc();
            var app = builder.Build();
            app.MapGrpcService<GreeterService>();
            app.Run();
            """);

        var project = MakeDescriptor("Grpc");
        var evidence = CSharpRuntimeEvidenceCollector.Collect(projectDir, project);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.Capability &&
            e.EvidenceValue == "Capability:GrpcService" &&
            e.WeightHint == 30);
    }

    [Fact]
    public void Runtime_Collect_TopLevelStatements_EmitsEntrypoint()
    {
        var projectDir = CreateProjectDir("Console");
        WriteCsFile(projectDir, "Program.cs", """
            Console.WriteLine("Hello, World!");
            return 0;
            """);

        var project = MakeDescriptor("Console");
        var evidence = CSharpRuntimeEvidenceCollector.Collect(projectDir, project);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.RuntimeCandidate &&
            e.EvidenceValue == "RuntimeCandidate:Entrypoint" &&
            e.WeightHint == 10);
    }

    [Fact]
    public void Runtime_Collect_MauiStartupPatterns_EmitEntrypointEvidence()
    {
        var projectDir = CreateProjectDir("HybridApp");
        WriteCsFile(projectDir, "MauiProgram.cs", """
            public static class MauiProgram
            {
                internal static string MobileBffHost = "http://localhost:11632/";

                public static MauiApp CreateMauiApp()
                {
                    var builder = MauiApp.CreateBuilder();
                    builder.UseMauiApp<App>();
                    builder.UseMauiMaps();
                    builder.Services.AddMauiBlazorWebView();
                    return builder.Build();
                }
            }
            """);

        var project = MakeDescriptor("HybridApp");
        var evidence = CSharpRuntimeEvidenceCollector.Collect(projectDir, project);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.RuntimeCandidate &&
            e.EvidenceValue == "RuntimeCandidate:Entrypoint" &&
            e.WeightHint == 25);
        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.RuntimeCandidate &&
            e.EvidenceValue == "RuntimeCandidate:Entrypoint" &&
            e.WeightHint == 20);
        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.RuntimeCandidate &&
            e.EvidenceValue == "RuntimeCandidate:Entrypoint" &&
            e.WeightHint == 15);
    }

    [Fact]
    public void Runtime_Collect_EmptyDirectory_ReturnsEmpty()
    {
        var projectDir = CreateProjectDir("Empty");
        var project = MakeDescriptor("Empty");
        var evidence = CSharpRuntimeEvidenceCollector.Collect(projectDir, project);

        Assert.Empty(evidence);
    }

    // === CSharpCapabilityCollector ===

    [Fact]
    public void Capability_Collect_ApiControllerAttribute()
    {
        var projectDir = CreateProjectDir("CapApi");
        var file = WriteCsFile(projectDir, "Controller.cs", """
            using Microsoft.AspNetCore.Mvc;

            [ApiController]
            [Route("api/[controller]")]
            public class OrdersController : ControllerBase
            {
                [HttpGet]
                public IActionResult Get() => Ok();
            }
            """);

        var evidence = CSharpCapabilityCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.Capability &&
            e.EvidenceValue == "Capability:HttpApi");
    }

    [Fact]
    public void Capability_Collect_BackgroundService()
    {
        var projectDir = CreateProjectDir("CapWorker");
        var file = WriteCsFile(projectDir, "Worker.cs", """
            public class MyWorker : BackgroundService
            {
                protected override async Task ExecuteAsync(CancellationToken ct)
                {
                    while (!ct.IsCancellationRequested)
                    {
                        await Task.Delay(1000, ct);
                    }
                }
            }
            """);

        var evidence = CSharpCapabilityCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.Capability &&
            e.EvidenceValue == "Capability:BackgroundWorker");
    }

    [Fact]
    public void Capability_Collect_IHostedService()
    {
        var projectDir = CreateProjectDir("CapHosted");
        var file = WriteCsFile(projectDir, "Service.cs", """
            public class TimerService : IHostedService
            {
                public Task StartAsync(CancellationToken ct) => Task.CompletedTask;
                public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
            }
            """);

        var evidence = CSharpCapabilityCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.Capability &&
            e.EvidenceValue == "Capability:BackgroundWorker");
    }

    [Fact]
    public void Capability_Collect_GrpcRegistration()
    {
        var projectDir = CreateProjectDir("CapGrpc");
        var file = WriteCsFile(projectDir, "Program.cs", """
            public class Startup
            {
                public void Configure(IApplicationBuilder app)
                {
                    app.MapGrpcService<GreeterService>();
                }
            }
            """);

        var evidence = CSharpCapabilityCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.Capability &&
            e.EvidenceValue == "Capability:GrpcService");
    }

    [Fact]
    public void Capability_Collect_ConventionalController_InheritsController()
    {
        var projectDir = CreateProjectDir("CapMvc");
        var file = WriteCsFile(projectDir, "HomeController.cs", """
            using Microsoft.AspNetCore.Mvc;

            public class HomeController : Controller
            {
                public IActionResult Index() => View();
            }
            """);

        var evidence = CSharpCapabilityCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.Capability &&
            e.EvidenceValue == "Capability:HttpApi");
    }

    [Fact]
    public void Capability_Collect_CustomMapApiPattern()
    {
        var projectDir = CreateProjectDir("CapRouteGroup");
        var file = WriteCsFile(projectDir, "Program.cs", """
            var builder = WebApplication.CreateBuilder(args);
            var app = builder.Build();
            app.MapCatalogApi();
            app.Run();
            """);

        var evidence = CSharpCapabilityCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.Capability &&
            e.EvidenceValue == "Capability:HttpApi");
    }

    [Fact]
    public void Capability_Collect_MvcAndRazorPatterns()
    {
        var projectDir = CreateProjectDir("CapUi");
        var file = WriteCsFile(projectDir, "Program.cs", """
            var builder = WebApplication.CreateBuilder(args);
            builder.Services.AddControllersWithViews();
            var app = builder.Build();
            app.MapDefaultControllerRoute();
            app.MapRazorComponents<App>();
            app.MapForwarder("/img/{id}", "https+http://catalog-api", "/api/catalog/items/{id}/pic");
            app.Run();
            """);

        var evidence = CSharpCapabilityCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.Capability &&
            e.EvidenceValue == "Capability:HttpApi");
    }

    [Fact]
    public void Capability_Collect_AddSubscription_EmitsMessageConsumer()
    {
        var projectDir = CreateProjectDir("CapBus");
        var file = WriteCsFile(projectDir, "Extensions.cs", """
            public static class EventBusExtensions
            {
                public static void Configure(object eventBus)
                {
                    eventBus.AddSubscription<OrderCreated, OrderCreatedHandler>();
                }
            }
            """);

        var evidence = CSharpCapabilityCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.Capability &&
            e.EvidenceValue == "Capability:MessageConsumer");
    }

    [Fact]
    public void Capability_Collect_EmptyFiles_ReturnsEmpty()
    {
        var projectDir = CreateProjectDir("CapEmpty");
        var evidence = CSharpCapabilityCollector.Collect(projectDir, []);

        Assert.Empty(evidence);
    }

    // === CSharpOutboundEvidenceCollector ===

    [Fact]
    public void Outbound_Collect_AddHttpClient()
    {
        var projectDir = CreateProjectDir("OutHttp");
        var file = WriteCsFile(projectDir, "Startup.cs", """
            public class Startup
            {
                public void ConfigureServices(IServiceCollection services)
                {
                    services.AddHttpClient<IOrderClient, OrderClient>();
                }
            }
            """);

        var evidence = CSharpOutboundEvidenceCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.OutboundCommunication &&
            e.EvidenceValue == "Outbound:HttpClient");
    }

    [Fact]
    public void Outbound_Collect_AddHttpClient_ExtractsTarget()
    {
        var projectDir = CreateProjectDir("OutHttpTarget");
        var file = WriteCsFile(projectDir, "Startup.cs", """
            public static class Extensions
            {
                public static void Configure(IServiceCollection services)
                {
                    services.AddHttpClient<CatalogService>(o => o.BaseAddress = new("https+http://catalog-api"));
                }
            }
            """);

        var evidence = CSharpOutboundEvidenceCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.OutboundCommunication &&
            e.EvidenceValue == "Outbound:HttpClient:catalog-api");
    }

    [Fact]
    public void Outbound_Collect_GrpcChannelForAddress()
    {
        var projectDir = CreateProjectDir("OutGrpc");
        var file = WriteCsFile(projectDir, "Client.cs", """
            public class GrpcClientFactory
            {
                public GreeterClient Create()
                {
                    var channel = GrpcChannel.ForAddress("https://localhost:5001");
                    return new GreeterClient(channel);
                }
            }
            """);

        var evidence = CSharpOutboundEvidenceCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.OutboundCommunication &&
            e.EvidenceValue == "Outbound:GrpcClient");
    }

    [Fact]
    public void Outbound_Collect_GrpcChannelForAddress_ExtractsTarget()
    {
        var projectDir = CreateProjectDir("OutGrpcTarget");
        var file = WriteCsFile(projectDir, "Client.cs", """
            public class GrpcClientFactory
            {
                public GreeterClient Create()
                {
                    var channel = GrpcChannel.ForAddress("http://basket-api");
                    return new GreeterClient(channel);
                }
            }
            """);

        var evidence = CSharpOutboundEvidenceCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.OutboundCommunication &&
            e.EvidenceValue == "Outbound:GrpcClient:basket-api");
    }

    [Fact]
    public void Outbound_Collect_AddGrpcClient()
    {
        var projectDir = CreateProjectDir("OutGrpcClient");
        var file = WriteCsFile(projectDir, "Startup.cs", """
            public class Startup
            {
                public void ConfigureServices(IServiceCollection services)
                {
                    services.AddGrpcClient<GreeterClient>(o =>
                    {
                        o.Address = new Uri("https://localhost:5001");
                    });
                }
            }
            """);

        var evidence = CSharpOutboundEvidenceCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.OutboundCommunication &&
            e.EvidenceValue == "Outbound:GrpcClient");
    }

    [Fact]
    public void Outbound_Collect_AddGrpcClient_ExtractsTarget()
    {
        var projectDir = CreateProjectDir("OutGrpcClientTarget");
        var file = WriteCsFile(projectDir, "Startup.cs", """
            public static class Extensions
            {
                public static void Configure(IServiceCollection services)
                {
                    services.AddGrpcClient<Basket.BasketClient>(o =>
                    {
                        o.Address = new("http://basket-api");
                    });
                }
            }
            """);

        var evidence = CSharpOutboundEvidenceCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.OutboundCommunication &&
            e.EvidenceValue == "Outbound:GrpcClient:basket-api");
    }

    [Fact]
    public void Outbound_Collect_MapForwarder_ExtractsTarget()
    {
        var projectDir = CreateProjectDir("OutForwarder");
        var file = WriteCsFile(projectDir, "Program.cs", """
            var app = WebApplication.CreateBuilder(args).Build();
            app.MapForwarder("/img/{id}", "https+http://catalog-api", "/api/catalog/items/{id}/pic");
            """);

        var evidence = CSharpOutboundEvidenceCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.OutboundCommunication &&
            e.EvidenceValue == "Outbound:HttpClient:catalog-api");
    }

    [Fact]
    public void Outbound_Collect_AddRabbitMqEventBus_ExtractsTarget()
    {
        var projectDir = CreateProjectDir("OutBus");
        var file = WriteCsFile(projectDir, "Extensions.cs", """
            public static class EventBusExtensions
            {
                public static object Configure(object builder)
                {
                    return builder.AddRabbitMqEventBus("eventbus");
                }
            }
            """);

        var evidence = CSharpOutboundEvidenceCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.OutboundCommunication &&
            e.EvidenceValue == "Outbound:MessageBus:eventbus");
    }

    [Fact]
    public void Outbound_Collect_AddOpenIdConnect_Authority_ExtractsConfigToken()
    {
        var projectDir = CreateProjectDir("OutAuth");
        var file = WriteCsFile(projectDir, "Extensions.cs", """
            public static class AuthExtensions
            {
                public static void Configure(object services, object configuration)
                {
                    var identityUrl = configuration.GetRequiredValue("IdentityUrl");
                    services.AddAuthentication()
                        .AddOpenIdConnect(options =>
                        {
                            options.Authority = identityUrl;
                            options.ClientId = "webapp";
                        });
                }
            }
            """);

        var evidence = CSharpOutboundEvidenceCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.OutboundCommunication &&
            e.EvidenceValue == "Outbound:AuthProvider:IdentityUrl");
    }

    [Fact]
    public void Outbound_Collect_OidcClientOptions_Authority_ExtractsMemberToken()
    {
        var projectDir = CreateProjectDir("OutOidc");
        var file = WriteCsFile(projectDir, "IdentityService.cs", """
            public sealed class IdentityService
            {
                private object _settingsService;

                public object GetClient()
                {
                    var options = new OidcClientOptions
                    {
                        Authority = _settingsService.IdentityEndpointBase,
                        RedirectUri = _settingsService.CallbackUri
                    };

                    return options;
                }
            }
            """);

        var evidence = CSharpOutboundEvidenceCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.OutboundCommunication &&
            e.EvidenceValue == "Outbound:AuthProvider:IdentityEndpointBase");
    }

    [Fact]
    public void Outbound_Collect_GrpcChannel_ConfigBackedTarget_ExtractsSymbolicToken()
    {
        var projectDir = CreateProjectDir("OutGrpcConfig");
        var file = WriteCsFile(projectDir, "BasketService.cs", """
            public sealed class BasketService
            {
                private object _settingsService;

                public object Create()
                {
                    return GrpcChannel.ForAddress(_settingsService.GatewayBasketEndpointBase);
                }
            }
            """);

        var evidence = CSharpOutboundEvidenceCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.OutboundCommunication &&
            e.EvidenceValue == "Outbound:GrpcClient:GatewayBasketEndpointBase");
    }

    [Fact]
    public void Outbound_Collect_RequestProvider_CombineUri_ExtractsSymbolicToken()
    {
        var projectDir = CreateProjectDir("OutRequestProvider");
        var file = WriteCsFile(projectDir, "CatalogService.cs", """
            public sealed class CatalogService
            {
                private object _settingsService;
                private object _requestProvider;
                private const string ApiUrlBase = "api/catalog";

                public async Task<object> GetCatalogAsync()
                {
                    var uri = UriHelper.CombineUri(_settingsService.GatewayCatalogEndpointBase, $"{ApiUrlBase}/items");
                    return await _requestProvider.GetAsync<CatalogRoot>(uri).ConfigureAwait(false);
                }
            }
            """);

        var evidence = CSharpOutboundEvidenceCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.OutboundCommunication &&
            e.EvidenceValue == "Outbound:HttpClient:GatewayCatalogEndpointBase");
    }

    [Fact]
    public void Outbound_Collect_AddHttpClient_StaticMobileBffTarget_ExtractsLoopbackHost()
    {
        var projectDir = CreateProjectDir("OutBff");
        var file = WriteCsFile(projectDir, "MauiProgram.cs", """
            public static class MauiProgram
            {
                internal static string MobileBffHost = "http://localhost:11632/";

                public static void Configure(object services)
                {
                    services.AddHttpClient<CatalogService>(o => o.BaseAddress = new(MobileBffHost));
                }
            }
            """);

        var evidence = CSharpOutboundEvidenceCollector.Collect(projectDir, [file]);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.OutboundCommunication &&
            e.EvidenceValue == "Outbound:HttpClient:localhost");
    }

    [Fact]
    public void Outbound_Collect_EmptyFiles_ReturnsEmpty()
    {
        var projectDir = CreateProjectDir("OutEmpty");
        var evidence = CSharpOutboundEvidenceCollector.Collect(projectDir, []);

        Assert.Empty(evidence);
    }

    // === CSharpConfigHintCollector ===

    [Fact]
    public void Config_Collect_HttpUrl()
    {
        var projectDir = CreateProjectDir("CfgUrl");
        WriteConfigFile(projectDir, "appsettings.json", """
            {
                "Services": {
                    "OrderApi": "https://orders.example.com/api"
                }
            }
            """);

        var evidence = CSharpConfigHintCollector.Collect(projectDir);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.ConfigEndpointHint &&
            e.EvidenceValue.Contains("https://orders.example.com/api"));
    }

    [Fact]
    public void Config_Collect_ConnectionString()
    {
        var projectDir = CreateProjectDir("CfgConn");
        WriteConfigFile(projectDir, "appsettings.json", """
            {
                "ConnectionStrings": {
                    "Default": "Host=localhost;Database=mydb;Username=user;Password=pass"
                }
            }
            """);

        var evidence = CSharpConfigHintCollector.Collect(projectDir);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.ConfigEndpointHint &&
            e.EvidenceValue.Contains("ConnectionStrings:Default"));
    }

    [Fact]
    public void Config_Collect_EnvironmentSpecificFile()
    {
        var projectDir = CreateProjectDir("CfgEnv");
        WriteConfigFile(projectDir, "appsettings.Development.json", """
            {
                "Endpoints": {
                    "Auth": "http://localhost:8080/auth"
                }
            }
            """);

        var evidence = CSharpConfigHintCollector.Collect(projectDir);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.ConfigEndpointHint &&
            e.EvidenceValue.Contains("http://localhost:8080/auth"));
    }

    [Fact]
    public void Config_Collect_ServiceDiscoveryUrl()
    {
        var projectDir = CreateProjectDir("CfgDiscovery");
        WriteConfigFile(projectDir, "appsettings.json", """
            {
                "Services": {
                    "CatalogApi": "https+http://catalog-api"
                }
            }
            """);

        var evidence = CSharpConfigHintCollector.Collect(projectDir);

        Assert.Contains(evidence, e =>
            e.EvidenceKind == EvidenceKind.ConfigEndpointHint &&
            e.EvidenceValue.Contains("https+http://catalog-api"));
    }

    [Fact]
    public void Config_Collect_NoConfigFiles_ReturnsEmpty()
    {
        var projectDir = CreateProjectDir("CfgEmpty");
        var evidence = CSharpConfigHintCollector.Collect(projectDir);

        Assert.Empty(evidence);
    }

    [Fact]
    public void Config_Collect_MalformedJson_SkipsFile()
    {
        var projectDir = CreateProjectDir("CfgBad");
        WriteConfigFile(projectDir, "appsettings.json", "{ not valid json }}}");

        var evidence = CSharpConfigHintCollector.Collect(projectDir);

        Assert.Empty(evidence);
    }

    [Fact]
    public void Config_Collect_NonUrlValues_Ignored()
    {
        var projectDir = CreateProjectDir("CfgNoUrl");
        WriteConfigFile(projectDir, "appsettings.json", """
            {
                "Logging": {
                    "LogLevel": {
                        "Default": "Information"
                    }
                }
            }
            """);

        var evidence = CSharpConfigHintCollector.Collect(projectDir);

        Assert.Empty(evidence);
    }

    // === Helpers ===

    private string CreateProjectDir(string name)
    {
        var dir = Path.Combine(_tempDir, name);
        Directory.CreateDirectory(dir);
        return dir;
    }

    private static string WriteCsFile(string dir, string fileName, string content)
    {
        var path = Path.Combine(dir, fileName);
        File.WriteAllText(path, content);
        return path;
    }

    private static void WriteConfigFile(string dir, string fileName, string content)
    {
        File.WriteAllText(Path.Combine(dir, fileName), content);
    }

    private static ProjectDescriptor MakeDescriptor(string name) =>
        new(
            Path: $"/src/{name}.csproj", Name: name,
            Sdk: "Microsoft.NET.Sdk", TargetFramework: "net10.0",
            OutputType: null, PackageReferences: [], ProjectReferences: [],
            IsTestProject: false, IsPackable: null);
}
