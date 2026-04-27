namespace FlowConsole.Cli.Tests;

internal sealed class EmptyRemainingArguments : IRemainingArguments
{
    public ILookup<string, string?> Parsed => Enumerable.Empty<string>()
        .ToLookup(_ => string.Empty, _ => (string?)null);

    public IReadOnlyList<string> Raw => [];
}

internal static class TestHelper
{
    public static CommandContext CreateContext(string commandName = "test")
    {
        return new CommandContext([], new EmptyRemainingArguments(), commandName, null!);
    }
}
