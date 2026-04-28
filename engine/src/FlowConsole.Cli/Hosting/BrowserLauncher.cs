using System.ComponentModel;
using System.Diagnostics;
using FlowConsole.Cli.Infrastructure;

namespace FlowConsole.Cli.Hosting;

public class BrowserLauncher
{
    public virtual void TryOpen(string url)
    {
        if (EnvironmentDetector.IsCI)
            return;

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true,
            });
        }
        catch (Win32Exception)
        {
            CliConsole.Warn("Could not open browser automatically. Open the URL manually.");
        }
        catch (InvalidOperationException)
        {
            CliConsole.Warn("Could not open browser automatically. Open the URL manually.");
        }
    }
}
