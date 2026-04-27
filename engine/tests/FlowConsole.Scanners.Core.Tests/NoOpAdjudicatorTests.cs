using FlowConsole.Core.Evidence;
using FlowConsole.Scanners.Core;
using FluentAssertions;

namespace FlowConsole.Scanners.Core.Tests;

public class NoOpAdjudicatorTests
{
    private readonly NoOpAdjudicator _sut = new();

    [Fact]
    public void IsAvailable_ReturnsFalse()
    {
        _sut.IsAvailable.Should().BeFalse();
    }

    [Fact]
    public async Task ReviewAsync_ReturnsBaselinePassthrough()
    {
        var deterministicResult = new InferenceResult<string>(
            "WebApi",
            Confidence.Medium,
            [new EvidenceRecord("svc", EvidenceKind.RuntimeCandidate, "aspnet", "Program.cs:1", "Program.cs", "csharp", 10)],
            ["Worker", "Console"],
            "What runtime is this?");

        var evidence = new List<EvidenceRecord>
        {
            new("svc", EvidenceKind.RuntimeCandidate, "aspnet", "Program.cs:1", "Program.cs", "csharp", 10)
        };

        var result = await _sut.ReviewAsync(
            deterministicResult,
            evidence,
            "What runtime is this?",
            CancellationToken.None);

        result.Verdict.Should().Be(InferenceReviewVerdict.Confirm);
        result.SuggestedValue.Should().BeNull();
        result.Rationale.Should().Be("LLM not available");
        result.Confidence.Should().Be(Confidence.Medium);
        result.ModelId.Should().BeNull();
    }

    [Fact]
    public async Task ReviewAsync_PreservesConfidenceFromInput()
    {
        var deterministicResult = new InferenceResult<int>(
            42,
            Confidence.High,
            [],
            null,
            null);

        var result = await _sut.ReviewAsync(
            deterministicResult,
            [],
            "test question",
            CancellationToken.None);

        result.Confidence.Should().Be(Confidence.High);
    }

    [Fact]
    public async Task ReviewAsync_ThrowsOnNullDeterministicResult()
    {
        var act = () => _sut.ReviewAsync<string>(
            null!,
            [],
            "question",
            CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentNullException>();
    }
}
