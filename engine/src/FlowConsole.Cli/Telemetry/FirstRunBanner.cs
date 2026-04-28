namespace FlowConsole.Cli.Telemetry;

internal static class FirstRunBanner
{
    internal const string ShortNotice = """

FlowConsole CLI (fc) sends anonymous usage stats: command, exit_code, duration_ms, cli_version, platform, session_id.
We never collect file paths, file content, identifiers, or anything else.
Disable: fcon telemetry off  •  CI: FLOWCONSOLE_TELEMETRY=off or DO_NOT_TRACK=1  •  Details: fcon telemetry status --verbose

""";
}
