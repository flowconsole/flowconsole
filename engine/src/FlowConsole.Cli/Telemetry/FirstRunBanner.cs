namespace FlowConsole.Cli.Telemetry;

/// <summary>
/// First-run telemetry consent banner, printed to stderr once per installation.
/// Content per main design doc specification.
/// </summary>
internal static class FirstRunBanner
{
    internal const string Text = """

FlowConsole CLI (fc) sends anonymous usage stats to PostHog to help us improve
the product:
  cli_version, platform, command, exit_code, duration_ms, session_id (per-run)
We NEVER collect: file paths, file content, hostnames, usernames, snapshot content,
                  stack traces, env vars, API keys, IP address, geolocation, user
                  agent, anything that can identify you or your code.
Provider: PostHog (https://posthog.com/privacy)
Endpoint: POST https://app.posthog.com/capture/ (direct — no FlowConsole backend)
Note: public capture keys are not a trust boundary. We treat this data as advisory
      only and never as a basis for contract/SLA/support decisions.
To disable permanently, run:  fcon telemetry off
Read the full policy:         fcon telemetry status --verbose

""";
}
