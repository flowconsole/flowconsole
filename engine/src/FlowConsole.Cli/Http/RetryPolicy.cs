using System.Net;
using FlowConsole.Cli.Infrastructure;

namespace FlowConsole.Cli.Http;

/// <summary>
/// Manual retry with exponential backoff + circuit breaker for HTTP calls.
/// Avoids Polly dependency (~2 MB SFA overhead).
/// </summary>
internal sealed class RetryPolicy
{
    private static readonly TimeSpan[] Delays = [
        TimeSpan.FromSeconds(1),
        TimeSpan.FromSeconds(4),
        TimeSpan.FromSeconds(16)
    ];

    private const int CircuitBreakerThreshold = 3;

    public int MaxAttempts => Delays.Length + 1; // 1 initial + 3 retries

    /// <summary>
    /// Executes an HTTP request with retry on transient errors and circuit breaker on consecutive 5xx.
    /// </summary>
    public async Task<HttpResponseMessage> ExecuteAsync(
        Func<Task<HttpResponseMessage>> sendRequest,
        bool verbose,
        CancellationToken ct)
    {
        var consecutive5xx = 0;
        HttpResponseMessage? lastResponse = null;

        try
        {
            for (var attempt = 0; attempt < MaxAttempts; attempt++)
            {
                ct.ThrowIfCancellationRequested();

                if (attempt > 0)
                {
                    var delay = Delays[attempt - 1];
                    if (verbose)
                        CliConsole.Detail($"  retry {attempt}/{Delays.Length} after {delay.TotalSeconds}s...");
                    await Task.Delay(delay, ct).ConfigureAwait(false);
                }

                HttpResponseMessage response;
                try
                {
                    response = await sendRequest().ConfigureAwait(false);
                }
                catch (HttpRequestException) when (attempt < Delays.Length)
                {
                    continue;
                }
                catch (TaskCanceledException) when (!ct.IsCancellationRequested && attempt < Delays.Length)
                {
                    continue;
                }

                // Non-transient errors — return immediately
                if (!IsTransient(response.StatusCode))
                {
                    lastResponse?.Dispose();
                    lastResponse = null;
                    return response;
                }

                // Track consecutive 5xx for circuit breaker
                if ((int)response.StatusCode >= 500)
                {
                    consecutive5xx++;
                    if (consecutive5xx >= CircuitBreakerThreshold)
                    {
                        lastResponse?.Dispose();
                        lastResponse = null;
                        if (verbose)
                            CliConsole.Detail($"  circuit breaker: {consecutive5xx} consecutive 5xx, aborting");
                        return response;
                    }
                }
                else
                {
                    consecutive5xx = 0;
                }

                lastResponse?.Dispose();
                lastResponse = response;
            }

            var result = lastResponse!;
            lastResponse = null;
            return result;
        }
        finally
        {
            lastResponse?.Dispose();
        }
    }

    private static bool IsTransient(HttpStatusCode status)
    {
        return (int)status >= 500 || status == HttpStatusCode.RequestTimeout;
    }
}
