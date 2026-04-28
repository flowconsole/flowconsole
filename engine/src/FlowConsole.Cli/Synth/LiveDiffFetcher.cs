using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

namespace FlowConsole.Cli.Synth;

internal class LiveDiffFetcher
{
    private readonly HttpClient _httpClient;

    public LiveDiffFetcher(HttpClient? httpClient = null)
    {
        _httpClient = httpClient ?? new HttpClient();
    }

    public sealed record FetchResult(
        bool Success,
        JsonDocument? Snapshot,
        int? StatusCode,
        string? ErrorMessage);

    public virtual async Task<FetchResult> FetchSnapshotAsync(string apiUrl, string modelId, CancellationToken ct = default)
    {
        var apiKey = Environment.GetEnvironmentVariable("FLOWCONSOLE_API_KEY");

        var url = $"{apiUrl.TrimEnd('/')}/api/v1/models/{Uri.EscapeDataString(modelId)}/ir?source=git";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);

        if (!string.IsNullOrEmpty(apiKey))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        }

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, ct).ConfigureAwait(false);
        }
        catch (HttpRequestException ex)
        {
            return new FetchResult(false, null, null, $"Network error: {ex.Message}");
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            return new FetchResult(false, null, null, "Request timed out.");
        }

        using (response)
        {
            var statusCode = (int)response.StatusCode;

            if (response.StatusCode == HttpStatusCode.Unauthorized)
                return new FetchResult(false, null, statusCode, "Authentication failed (401). Check FLOWCONSOLE_API_KEY.");

            if (response.StatusCode == HttpStatusCode.Forbidden)
                return new FetchResult(false, null, statusCode, "Access denied (403). Check API key permissions.");

            if (response.StatusCode == HttpStatusCode.NotFound)
                return new FetchResult(false, null, statusCode, "Model not found (404). Check model_id in config.");

            if (!response.IsSuccessStatusCode)
                return new FetchResult(false, null, statusCode, $"API returned {statusCode}.");

            try
            {
                var json = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
                var doc = JsonDocument.Parse(json);
                return new FetchResult(true, doc, statusCode, null);
            }
            catch (JsonException ex)
            {
                return new FetchResult(false, null, statusCode, $"Invalid JSON response: {ex.Message}");
            }
        }
    }
}
