using FlowConsole.Core.Evidence;

namespace FlowConsole.Scanners.CSharp;

/// <summary>
/// Infers the runtime kind of a C# project based on collected evidence
/// and metadata bonuses (SDK, OutputType). Uses weighted selection with
/// threshold-based confidence scoring.
/// </summary>
public static class CSharpRuntimeInferer
{
    private const int Threshold = 20;

    public static InferenceResult<RuntimeCandidateKind> Infer(
        ProjectDescriptor project,
        IReadOnlyList<EvidenceRecord> evidence)
    {
        ArgumentNullException.ThrowIfNull(project);
        ArgumentNullException.ThrowIfNull(evidence);

        // Test projects are resolved early with high confidence
        if (project.IsTestProject)
        {
            var testEvidence = evidence
                .Where(e => e.EvidenceKind == EvidenceKind.RuntimeCandidate &&
                            e.EvidenceValue.Contains("TestProject"))
                .ToList();

            return new InferenceResult<RuntimeCandidateKind>(
                RuntimeCandidateKind.TestProject,
                Confidence.High,
                testEvidence.Count > 0 ? testEvidence : evidence,
                null,
                null);
        }

        // Aggregate scores per candidate kind from evidence
        var scores = new Dictionary<RuntimeCandidateKind, (int Score, List<EvidenceRecord> Supporting)>();

        foreach (var record in evidence.Where(e => e.EvidenceKind == EvidenceKind.RuntimeCandidate))
        {
            if (!TryParseCandidate(record.EvidenceValue, out var kind))
                continue;

            if (!scores.TryGetValue(kind, out var entry))
            {
                entry = (0, []);
                scores[kind] = entry;
            }

            var weight = record.WeightHint ?? 0;
            scores[kind] = (entry.Score + weight, entry.Supporting);
            entry.Supporting.Add(record);
        }

        // Apply metadata bonuses
        ApplyMetadataBonuses(project, scores);

        // Weighted selection with threshold
        var result = SelectBestCandidate(scores);

        if (result is not null)
            return result;

        // Unresolved -> Library with low confidence and diagnostics
        return new InferenceResult<RuntimeCandidateKind>(
            RuntimeCandidateKind.Library,
            Confidence.Low,
            evidence,
            null,
            "Unresolved runtime kind; defaulting to Library");
    }

    private static InferenceResult<RuntimeCandidateKind>? SelectBestCandidate(
        Dictionary<RuntimeCandidateKind, (int Score, List<EvidenceRecord> Supporting)> scores)
    {
        if (scores.Count == 0)
            return null;

        var sorted = scores
            .OrderByDescending(kvp => kvp.Value.Score)
            .ToList();

        var best = sorted[0];
        if (best.Value.Score < Threshold)
            return null;

        // Check for ties at top score
        var tied = sorted.Where(kvp => kvp.Value.Score == best.Value.Score).ToList();

        if (tied.Count > 1)
        {
            // Tie-break: prefer more strong evidence, then fewer entries (simpler)
            var resolved = tied
                .OrderByDescending(t => t.Value.Supporting.Count(e => e.WeightHint.HasValue && e.WeightHint.Value >= Threshold))
                .ThenBy(t => t.Value.Supporting.Count)
                .First();

            // If truly unresolvable (same strong evidence count), still pick first by ordering
            return BuildResult(
                resolved.Key,
                resolved.Value.Score,
                resolved.Value.Supporting,
                sorted.Where(kvp => !EqualityComparer<RuntimeCandidateKind>.Default.Equals(kvp.Key, resolved.Key))
                    .Select(kvp => kvp.Key)
                    .ToList());
        }

        return BuildResult(
            best.Key,
            best.Value.Score,
            best.Value.Supporting,
            sorted.Skip(1).Select(kvp => kvp.Key).ToList());
    }

    private static InferenceResult<RuntimeCandidateKind> BuildResult(
        RuntimeCandidateKind winner,
        int score,
        List<EvidenceRecord> supporting,
        List<RuntimeCandidateKind> rejected)
    {
        var confidence = ScoreToConfidence(score);

        return new InferenceResult<RuntimeCandidateKind>(
            winner,
            confidence,
            supporting,
            rejected.Count > 0 ? rejected : null,
            null);
    }

    private static Confidence ScoreToConfidence(int score)
    {
        if (score == Threshold)
            return Confidence.Low;

        if (score < Threshold * 2)
            return Confidence.Medium;

        return Confidence.High;
    }

    private static void ApplyMetadataBonuses(
        ProjectDescriptor project,
        Dictionary<RuntimeCandidateKind, (int Score, List<EvidenceRecord> Supporting)> scores)
    {
        // Web SDK -> +40 to WebApplication
        if (project.Sdk is not null &&
            project.Sdk.Contains("Web", StringComparison.OrdinalIgnoreCase))
        {
            AddBonus(scores, RuntimeCandidateKind.WebApplication, 40);
        }

        // OutputType = Exe -> +20 to Entrypoint so non-test executables are runtime roots
        if (string.Equals(project.OutputType, "Exe", StringComparison.OrdinalIgnoreCase))
        {
            AddBonus(scores, RuntimeCandidateKind.Entrypoint, 20);
        }

        // OutputType = Library -> +20 to Library
        if (string.Equals(project.OutputType, "Library", StringComparison.OrdinalIgnoreCase))
        {
            AddBonus(scores, RuntimeCandidateKind.Library, 20);
        }
    }

    private static void AddBonus(
        Dictionary<RuntimeCandidateKind, (int Score, List<EvidenceRecord> Supporting)> scores,
        RuntimeCandidateKind kind,
        int bonus)
    {
        if (!scores.TryGetValue(kind, out var entry))
        {
            entry = (0, []);
        }

        scores[kind] = (entry.Score + bonus, entry.Supporting);
    }

    private static bool TryParseCandidate(string evidenceValue, out RuntimeCandidateKind kind)
    {
        // Evidence values are like "RuntimeCandidate:WebApplication" or just "WebApplication"
        var value = evidenceValue;
        var colonIdx = value.IndexOf(':');
        if (colonIdx >= 0)
            value = value[(colonIdx + 1)..];

        return Enum.TryParse(value.Trim(), ignoreCase: true, out kind);
    }
}
