using FlowConsole.Scanners.CSharp;
using FlowConsole.Scanners.CodeParsing.TreeSitterSupport;
using TreeSitter;

namespace FlowConsole.Scanners.CSharp.Tests.Unit;

public sealed class CSharpAstHelpersTests
{
    [Fact]
    public void TryGetInvocation_ExtractsQualifiedGenericInvocation()
    {
        using var language = new Language("c-sharp");
        using var parser = new Parser(language);
        using var tree = parser.Parse("""
            builder.Services.AddHttpClient<CatalogService>(o => o.BaseAddress = new("https+http://catalog-api")).AddAuthToken();
            """);

        var invocation = tree!.RootNode
            .DescendantsOfType("invocation_expression")
            .Select(node => CSharpAstHelpers.TryGetInvocation(node, out var info) ? info : null)
            .First(info => info?.MethodName == "AddHttpClient");

        Assert.NotNull(invocation);
        Assert.Equal(["builder", "Services", "AddHttpClient"], invocation!.NameChain);
        Assert.Single(invocation.Arguments);
    }

    [Fact]
    public void TryGetObjectCreation_ExtractsInitializerAssignments()
    {
        using var language = new Language("c-sharp");
        using var parser = new Parser(language);
        using var tree = parser.Parse("""
            var options = new OidcClientOptions { Authority = _settingsService.IdentityEndpointBase, RedirectUri = redirectUri };
            """);

        var objectCreation = tree!.RootNode.DescendantsOfType("object_creation_expression").Single();

        Assert.True(CSharpAstHelpers.TryGetObjectCreation(objectCreation, out var creation));
        Assert.Equal("OidcClientOptions", creation.TypeName);
        Assert.Contains(creation.InitializerAssignments, assignment => assignment.TargetName == "Authority");
    }

    [Fact]
    public void TryResolveValueToken_ResolvesConfigKeyFromOpenIdConnectLambda()
    {
        using var language = new Language("c-sharp");
        using var parser = new Parser(language);
        using var tree = parser.Parse("""
            var identityUrl = configuration.GetRequiredValue("IdentityUrl");
            services.AddOpenIdConnect(options => { options.Authority = identityUrl; options.ClientId = "webapp"; });
            """);

        var root = tree!.RootNode;
        var authorityAssignment = root.DescendantsOfType("assignment_expression")
            .Single(assignment =>
            {
                var leftNode = assignment.TryGetChildForField("left");
                return leftNode is not null && CSharpAstHelpers.TryGetSimpleName(leftNode) == "Authority";
            });

        var rightNode = authorityAssignment.TryGetChildForField("right");
        Assert.NotNull(rightNode);
        Assert.Equal("IdentityUrl", CSharpAstHelpers.TryResolveValueToken(rightNode!, root));
    }

    [Fact]
    public void TryResolveValueToken_ResolvesWrapperUriAliasToGatewayToken()
    {
        using var language = new Language("c-sharp");
        using var parser = new Parser(language);
        using var tree = parser.Parse("""
            var uri = UriHelper.CombineUri(_settingsService.GatewayCatalogEndpointBase, $"{ApiUrlBase}/items");
            await _requestProvider.GetAsync<CatalogRoot>(uri).ConfigureAwait(false);
            """);

        var root = tree!.RootNode;
        var getAsyncInvocation = root.DescendantsOfType("invocation_expression")
            .First(node =>
            {
                return CSharpAstHelpers.TryGetInvocation(node, out var invocation) &&
                       invocation.MethodName == "GetAsync";
            });

        Assert.True(CSharpAstHelpers.TryGetInvocation(getAsyncInvocation, out var info));
        Assert.Single(info.Arguments);
        Assert.Equal("GatewayCatalogEndpointBase", CSharpAstHelpers.TryResolveValueToken(info.Arguments[0], root));
    }

    [Fact]
    public void TryResolveValueToken_ResolvesStaticFieldLiteral()
    {
        using var language = new Language("c-sharp");
        using var parser = new Parser(language);
        using var tree = parser.Parse("""
            public static class Hosts
            {
                internal static string CatalogHost = "https+http://catalog-api";

                public static void Configure()
                {
                    var client = new(CatalogHost);
                }
            }
            """);

        var root = tree!.RootNode;
        var objectCreation = root.DescendantsOfType("implicit_object_creation_expression").Single();
        Assert.True(CSharpAstHelpers.TryGetObjectCreation(objectCreation, out var creation));
        Assert.Single(creation.Arguments);

        Assert.Equal("https+http://catalog-api", CSharpAstHelpers.TryResolveValueToken(creation.Arguments[0], root));
    }
}
