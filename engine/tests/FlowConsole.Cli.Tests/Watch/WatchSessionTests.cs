using System.Threading.Channels;
using FlowConsole.Cli.Watch;
using FluentAssertions;
using Xunit;

namespace FlowConsole.Cli.Tests.Watch;

public class WatchSessionTests
{
    private static RebuildResult Ok() => RebuildResult.Ok();

    [Fact]
    public async Task InitialBuildSuccess_SetsIdleAndIncrementsVersion()
    {
        var session = new WatchSession(_ => Task.FromResult(Ok()));

        var result = await session.RunInitialAsync(CancellationToken.None);

        result.Succeeded.Should().BeTrue();
        session.Status.Version.Should().Be(1);
        session.Status.State.Should().Be(WatchStatus.StateIdle);
        session.Status.LastError.Should().BeNull();
    }

    [Fact]
    public async Task InitialBuildFailure_SetsBuildFailedWithLastError()
    {
        var session = new WatchSession(_ => Task.FromResult(RebuildResult.Fail("compile error CS1002")));

        var result = await session.RunInitialAsync(CancellationToken.None);

        result.Succeeded.Should().BeFalse();
        session.Status.State.Should().Be(WatchStatus.StateBuildFailed);
        session.Status.LastError.Should().Be("compile error CS1002");
        session.Status.Version.Should().Be(0);
    }

    [Fact]
    public async Task RebuildAfterFailure_RecoversToIdleAndIncrementsVersion()
    {
        var fail = true;
        var session = new WatchSession(_ => Task.FromResult(
            fail ? RebuildResult.Fail("boom") : Ok()));

        await session.RunInitialAsync(CancellationToken.None);
        fail = false;
        await session.RunInitialAsync(CancellationToken.None);

        session.Status.State.Should().Be(WatchStatus.StateIdle);
        session.Status.LastError.Should().BeNull();
        session.Status.Version.Should().Be(1);
    }

    [Fact]
    public async Task RebuildException_IsCapturedAsFailureNotCrash()
    {
        var session = new WatchSession(_ => throw new InvalidOperationException("runner blew up"));

        var result = await session.RunInitialAsync(CancellationToken.None);

        result.Succeeded.Should().BeFalse();
        session.Status.State.Should().Be(WatchStatus.StateBuildFailed);
        session.Status.LastError.Should().Be("runner blew up");
    }

    [Fact]
    public async Task RequestRebuildWhileRunning_QueuesExactlyOneFollowUp()
    {
        var started = new TaskCompletionSource();
        var release = new TaskCompletionSource();
        var runCount = 0;

        var session = new WatchSession(async _ =>
        {
            Interlocked.Increment(ref runCount);
            started.TrySetResult();
            await release.Task;
            return Ok();
        });

        var initial = session.RunInitialAsync(CancellationToken.None);
        await started.Task;
        await WaitForBuildingAsync(session, TimeSpan.FromSeconds(5));

        session.RequestRebuild();
        session.RequestRebuild();
        session.RequestRebuild();

        release.TrySetResult();
        await initial;

        await WaitForAsync(() => runCount >= 2, TimeSpan.FromSeconds(5));
        await WaitForIdleAsync(session, TimeSpan.FromSeconds(5));

        runCount.Should().Be(2);
        session.Status.Version.Should().Be(2);
        session.Status.State.Should().Be(WatchStatus.StateIdle);

        session.Dispose();
    }

    [Fact]
    public async Task StatusTransitionsThroughBuilding()
    {
        var started = new TaskCompletionSource();
        var release = new TaskCompletionSource();
        var observed = new List<string>();

        var session = new WatchSession(async _ =>
        {
            started.TrySetResult();
            await release.Task;
            return Ok();
        });

        var run = session.RunInitialAsync(CancellationToken.None);
        await started.Task;
        observed.Add(session.Status.State);

        release.TrySetResult();
        await run;
        observed.Add(session.Status.State);

        observed.Should().Equal([WatchStatus.StateBuilding, WatchStatus.StateIdle]);
    }

    [Fact]
    public async Task FollowUpBuildRunsToCompletion_AfterCurrentBuild()
    {
        var events = Channel.CreateUnbounded<string>();
        var blockSecond = new TaskCompletionSource();
        var runIndex = 0;

        var session = new WatchSession(async _ =>
        {
            var idx = Interlocked.Increment(ref runIndex);
            await events.Writer.WriteAsync($"run{idx}");
            if (idx == 2)
                await blockSecond.Task;
            return Ok();
        });

        var first = session.RunInitialAsync(CancellationToken.None);
        await events.Reader.ReadAsync();

        session.RequestRebuild();
        await events.Reader.ReadAsync();

        blockSecond.TrySetResult();
        await first;

        await WaitForIdleAsync(session, TimeSpan.FromSeconds(5));
        session.Status.Version.Should().BeGreaterThanOrEqualTo(2);

        session.Dispose();
    }

    private static async Task WaitForAsync(Func<bool> condition, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (DateTime.UtcNow < deadline)
        {
            if (condition())
                return;
            await Task.Delay(20);
        }
    }

    private static Task WaitForIdleAsync(WatchSession session, TimeSpan timeout) =>
        WaitForAsync(() => session.Status.State != WatchStatus.StateBuilding, timeout);

    private static Task WaitForBuildingAsync(WatchSession session, TimeSpan timeout) =>
        WaitForAsync(() => session.Status.State == WatchStatus.StateBuilding, timeout);
}
