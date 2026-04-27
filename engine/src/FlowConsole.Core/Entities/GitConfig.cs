using System.Text.Json.Serialization;

namespace FlowConsole.Core.Entities;

public sealed record GitConfig
{
    public string RepoUrl { get; init; } = string.Empty;
    public string Branch { get; init; } = "main";
    public PathPatterns PathPatterns { get; init; } = new();
    public GitProviderConfig? ProviderConfig { get; init; }
}

public sealed record PathPatterns
{
    public IReadOnlyList<string> Dsl { get; init; } = [];
    public IReadOnlyList<string> Code { get; init; } = [];
    public IReadOnlyList<string> Infra { get; init; } = [];
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(DirectGitProviderConfig), "direct")]
public abstract record GitProviderConfig
{
    public abstract GitProviderConfig SanitizeSecrets();
    public abstract GitProviderConfig MergeSecretsFrom(GitProviderConfig? existing);
}

public sealed record DirectGitProviderConfig : GitProviderConfig
{
    public string? Username { get; init; }
    public string? Password { get; init; }

    public override GitProviderConfig SanitizeSecrets() =>
        this with { Password = null };

    public override GitProviderConfig MergeSecretsFrom(GitProviderConfig? existing)
    {
        if (existing is not DirectGitProviderConfig direct || !string.IsNullOrWhiteSpace(Password))
            return this;

        return this with { Password = direct.Password };
    }
}
