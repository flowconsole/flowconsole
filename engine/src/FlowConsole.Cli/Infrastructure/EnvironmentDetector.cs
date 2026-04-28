namespace FlowConsole.Cli.Infrastructure;

public static class EnvironmentDetector
{
    public static bool IsCI => !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("CI"));

    public static bool IsTty => !Console.IsOutputRedirected && !Console.IsInputRedirected;
}
