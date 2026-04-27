using FlowConsole.Scanners.Core;
using Microsoft.Extensions.DependencyInjection;

namespace FlowConsole.Cli.Tests.Infrastructure;

public sealed class DiResolverTests
{
    [Fact]
    public void IAdjudicator_ResolvesToNoOpAdjudicator()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IAdjudicator, NoOpAdjudicator>();

        using var provider = services.BuildServiceProvider();
        var adjudicator = provider.GetRequiredService<IAdjudicator>();

        adjudicator.Should().BeOfType<NoOpAdjudicator>();
        adjudicator.IsAvailable.Should().BeFalse();
    }
}
