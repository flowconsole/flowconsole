using FlowConsole.Cli.Hosting;
using FlowConsole.Cli.Infrastructure;

namespace FlowConsole.Cli.Tests.Hosting;

public sealed class BrowserLauncherTests
{
    private sealed class TrackingBrowserLauncher : BrowserLauncher
    {
        public bool WasCalled { get; private set; }

        public override void TryOpen(string url)
        {
            if (EnvironmentDetector.IsCI)
                return;

            WasCalled = true;
        }
    }

    [Fact]
    public void TryOpen_WhenCI_DoesNotAttemptLaunch()
    {
        var original = Environment.GetEnvironmentVariable("CI");
        try
        {
            Environment.SetEnvironmentVariable("CI", "true");

            var launcher = new TrackingBrowserLauncher();
            launcher.TryOpen("http://localhost:1234");

            launcher.WasCalled.Should().BeFalse();
        }
        finally
        {
            Environment.SetEnvironmentVariable("CI", original);
        }
    }

    [Fact]
    public void TryOpen_WhenNotCI_AttemptsLaunch()
    {
        var original = Environment.GetEnvironmentVariable("CI");
        try
        {
            Environment.SetEnvironmentVariable("CI", null);

            var launcher = new TrackingBrowserLauncher();
            launcher.TryOpen("http://localhost:1234");

            launcher.WasCalled.Should().BeTrue();
        }
        finally
        {
            Environment.SetEnvironmentVariable("CI", original);
        }
    }

    [Fact]
    public void TryOpen_RealLauncher_DoesNotThrowOnInvalidUrl()
    {
        var original = Environment.GetEnvironmentVariable("CI");
        try
        {
            Environment.SetEnvironmentVariable("CI", null);

            var launcher = new BrowserLauncher();
            var act = () => launcher.TryOpen("http://localhost:99999");

            act.Should().NotThrow();
        }
        finally
        {
            Environment.SetEnvironmentVariable("CI", original);
        }
    }
}
