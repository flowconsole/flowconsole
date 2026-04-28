using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace FlowConsole.Cli.Http;

internal sealed class FlowConsoleApiClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly RetryPolicy _retryPolicy;

    public FlowConsoleApiClient(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
        _retryPolicy = new RetryPolicy();
    }

    public sealed record PushResult(
        bool Success,
        int StatusCode,
        int? ModelVersion,
        string? ErrorMessage,
        IReadOnlyList<string>? Warnings);

    public async Task<PushResult> PushSnapshotAsync(
        string apiUrl,
        string modelId,
        string snapshotJson,
        string apiKey,
        bool verbose,
        CancellationToken ct)
    {
        var url = $"{apiUrl.TrimEnd('/')}/api/v1/models/{Uri.EscapeDataString(modelId)}/ir";
        var client = _httpClientFactory.CreateClient("FlowConsole");

        var response = await _retryPolicy.ExecuteAsync(async () =>
        {
            using var content = new StringContent(snapshotJson, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Put, url) { Content = content };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            // Cannot dispose response here — caller needs it
            return await client.SendAsync(request, ct).ConfigureAwait(false);
        }, verbose, ct).ConfigureAwait(false);

        using (response)
        {
            var statusCode = (int)response.StatusCode;
            var body = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
                return ParseSuccessResponse(statusCode, body);

            return statusCode switch
            {
                401 => new PushResult(false, statusCode, null, "Authentication failed (401). Check FLOWCONSOLE_API_KEY.", null),
                403 => new PushResult(false, statusCode, null, "Access denied (403). Check API key permissions.", null),
                404 => new PushResult(false, statusCode, null, "Model not found (404). Check --model ID.", null),
                413 => new PushResult(false, statusCode, null, "Payload too large (413). Snapshot exceeds server size limit.", null),
                422 => ParseSchemaVersionError(statusCode, body),
                429 => new PushResult(false, statusCode, null, "Rate limited (429). Try again later.", null),
                _ => new PushResult(false, statusCode, null, $"Server error ({statusCode}): {body}", null)
            };
        }
    }

    public sealed record FindingsPushResult(
        bool Success,
        int StatusCode,
        string? ValidationRunId,
        string? ErrorMessage);

    public async Task<FindingsPushResult> PushFindingsAsync(
        string apiUrl,
        string modelId,
        string findingsJson,
        string apiKey,
        bool verbose,
        CancellationToken ct)
    {
        var url = $"{apiUrl.TrimEnd('/')}/api/v1/models/{Uri.EscapeDataString(modelId)}/validation-runs";
        var client = _httpClientFactory.CreateClient("FlowConsole");

        var response = await _retryPolicy.ExecuteAsync(async () =>
        {
            using var content = new StringContent(findingsJson, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            return await client.SendAsync(request, ct).ConfigureAwait(false);
        }, verbose, ct).ConfigureAwait(false);

        using (response)
        {
            var statusCode = (int)response.StatusCode;
            var body = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);

            if (response.StatusCode == HttpStatusCode.Created)
            {
                var runId = ExtractValidationRunId(response, body);
                return new FindingsPushResult(true, statusCode, runId, null);
            }

            return statusCode switch
            {
                401 => new FindingsPushResult(false, statusCode, null, "Authentication failed (401). Check FLOWCONSOLE_API_KEY."),
                403 => new FindingsPushResult(false, statusCode, null, "Access denied (403). Check API key permissions."),
                404 => new FindingsPushResult(false, statusCode, null, "Model not found (404). Check --model ID."),
                413 => new FindingsPushResult(false, statusCode, null, "Payload too large (413). Findings exceed server size limit."),
                422 => new FindingsPushResult(false, statusCode, null, $"Validation error (422): {body}"),
                429 => new FindingsPushResult(false, statusCode, null, "Rate limited (429). Try again later."),
                _ => new FindingsPushResult(false, statusCode, null, $"Server error ({statusCode}): {body}")
            };
        }
    }

    private static PushResult ParseSuccessResponse(int statusCode, string body)
    {
        int? modelVersion = null;
        List<string>? warnings = null;

        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            if (root.TryGetProperty("version", out var mv) && mv.ValueKind == JsonValueKind.Number)
                modelVersion = mv.GetInt32();

            if (root.TryGetProperty("warnings", out var w) && w.ValueKind == JsonValueKind.Array)
            {
                warnings = [];
                foreach (var item in w.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.String)
                        warnings.Add(item.GetString()!);
                }
            }
        }
        catch (JsonException)
        {
            // Non-JSON success response — acceptable
        }

        return new PushResult(true, statusCode, modelVersion, null, warnings);
    }

    private static PushResult ParseSchemaVersionError(int statusCode, string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            if (root.TryGetProperty("minSupportedSchemaVersion", out var minVer) &&
                root.TryGetProperty("maxSupportedSchemaVersion", out var maxVer) &&
                root.TryGetProperty("received", out var received))
            {
                var msg = $"Schema version mismatch: backend supports {minVer.GetString()}-{maxVer.GetString()}, CLI sent {received.GetString()}. Upgrade CLI or backend.";
                return new PushResult(false, statusCode, null, msg, null);
            }
        }
        catch (JsonException) { }

        return new PushResult(false, statusCode, null, $"Validation error (422): {body}", null);
    }

    private static string? ExtractValidationRunId(HttpResponseMessage response, string body)
    {
        if (response.Headers.Location is { } location)
        {
            var path = location.IsAbsoluteUri ? location.AbsolutePath : location.OriginalString;
            var segments = path.Split('/');
            if (segments.Length > 0)
                return segments[^1];
        }

        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("id", out var id))
                return id.GetString() ?? id.GetRawText();
        }
        catch (JsonException) { }

        return null;
    }

}
