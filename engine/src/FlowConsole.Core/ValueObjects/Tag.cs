using System.Text.RegularExpressions;

namespace FlowConsole.Core.ValueObjects;

public readonly partial record struct Tag
{
    private static readonly Regex Pattern = TagPattern();

    public string Value { get; }

    public Tag(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Tag value cannot be empty.", nameof(value));

        if (!Pattern.IsMatch(value))
            throw new ArgumentException(
                $"Tag '{value}' does not match the required pattern: ^[a-zA-Z0-9_][a-zA-Z0-9_.:-]*$",
                nameof(value));

        Value = value;
    }

    public override string ToString() => Value;

    [GeneratedRegex(@"^[a-zA-Z0-9_][a-zA-Z0-9_.:\-]*$")]
    private static partial Regex TagPattern();
}
