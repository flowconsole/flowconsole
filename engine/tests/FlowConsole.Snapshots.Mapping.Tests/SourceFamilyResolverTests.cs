using FlowConsole.Core.ValueObjects;
using FlowConsole.Rules.Core.Model;
using FlowConsole.Snapshots.Mapping;
using FluentAssertions;

namespace FlowConsole.Snapshots.Mapping.Tests;

public class SourceFamilyResolverTests
{
    [Theory]
    [InlineData(ElementSource.Git, SourceFamily.Git)]
    [InlineData(ElementSource.CodeScan, SourceFamily.Code)]
    [InlineData(ElementSource.InfraScan, SourceFamily.Infra)]
    [InlineData(ElementSource.Import, SourceFamily.Import)]
    public void Resolve_SupportedSource_ReturnsMappedFamily(ElementSource source, SourceFamily expected)
    {
        var result = SourceFamilyResolver.Resolve(source);

        result.Should().Be(expected);
    }

    [Fact]
    public void Resolve_Observability_ThrowsNotSupportedException()
    {
        var act = () => SourceFamilyResolver.Resolve(ElementSource.Observability);

        act.Should().Throw<NotSupportedException>()
            .WithMessage("*Observability*not yet supported*");
    }
}
