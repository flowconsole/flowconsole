using Spectre.Console;

namespace FlowConsole.Cli.Infrastructure;

/// <summary>
/// Semantic colored output for user-facing messages.
/// Routes warnings/errors/info to stderr; success/result messages to stdout.
/// Honors NO_COLOR / --no-color via Spectre.Console's auto-detection.
/// User-supplied strings are escaped — only static prefixes carry markup.
///
/// Note: the stderr console is built per-call to honor <see cref="Console.SetError"/>
/// (used by tests that capture stderr into a StringWriter).
/// </summary>
public static class CliConsole
{
    private static IAnsiConsole CreateStderr() => AnsiConsole.Create(new AnsiConsoleSettings
    {
        Out = new AnsiConsoleOutput(Console.Error),
        Ansi = ResolveAnsiSupport(Console.IsErrorRedirected),
        ColorSystem = ColorSystemSupport.Standard,
    });

    private static IAnsiConsole CreateStdout() => AnsiConsole.Create(new AnsiConsoleSettings
    {
        Out = new AnsiConsoleOutput(Console.Out),
        Ansi = ResolveAnsiSupport(Console.IsOutputRedirected),
        ColorSystem = ColorSystemSupport.Standard,
    });

    private static AnsiSupport ResolveAnsiSupport(bool isRedirected)
    {
        if (Environment.GetEnvironmentVariable("NO_COLOR") is { Length: > 0 })
            return AnsiSupport.No;
        if (string.Equals(Environment.GetEnvironmentVariable("TERM"), "dumb", StringComparison.Ordinal))
            return AnsiSupport.No;
        if (isRedirected)
            return AnsiSupport.No;
        return AnsiSupport.Yes;
    }

    public static void Warn(string message) =>
        CreateStderr().MarkupLine($"[bold yellow]warning[/][bold]:[/] {Markup.Escape(message)}");

    public static void Error(string message) =>
        CreateStderr().MarkupLine($"[bold red]error[/][bold]:[/] {Markup.Escape(message)}");

    public static void Note(string message) =>
        CreateStderr().MarkupLine($"[bold cyan]note[/][bold]:[/] {Markup.Escape(message)}");

    public static void Hint(string message) =>
        CreateStderr().MarkupLine($"[bold blue]hint[/][bold]:[/] {Markup.Escape(message)}");

    public static void Success(string message) =>
        CreateStdout().MarkupLine($"[bold green]✓[/] {Markup.Escape(message)}");

    public static void Info(string message) =>
        CreateStderr().MarkupLine(Markup.Escape(message));

    public static void Detail(string message) =>
        CreateStderr().MarkupLine($"[grey]{Markup.Escape(message)}[/]");

    /// <summary>Dim multi-line block on stderr — for backgrounded blocks like the telemetry banner.</summary>
    public static void DetailBlock(string content) =>
        CreateStderr().Markup($"[grey]{Markup.Escape(content)}[/]");

    public static void Heading(string message) =>
        CreateStderr().MarkupLine($"[bold]{Markup.Escape(message)}[/]");

    /// <summary>
    /// Plain stdout — for piped/machine-readable content (JSON, SARIF, etc.).
    /// Always uncolored. Use <see cref="Console.Out"/> for streaming/large bodies.
    /// </summary>
    public static void Plain(string content) =>
        Console.Out.WriteLine(content);

    /// <summary>
    /// Format a stat line like "  ✓ Schema validated" with status glyph and dim detail.
    /// </summary>
    public static void Check(string label, string? detail = null)
    {
        if (detail is null)
            CreateStderr().MarkupLine($"  [bold green]✓[/] {Markup.Escape(label)}");
        else
            CreateStderr().MarkupLine($"  [bold green]✓[/] {Markup.Escape(label)} [grey]{Markup.Escape(detail)}[/]");
    }

    public static void Cross(string label, string? detail = null)
    {
        if (detail is null)
            CreateStderr().MarkupLine($"  [bold red]✗[/] {Markup.Escape(label)}");
        else
            CreateStderr().MarkupLine($"  [bold red]✗[/] {Markup.Escape(label)} [grey]{Markup.Escape(detail)}[/]");
    }

    public static void WarningGlyph(string label, string? detail = null)
    {
        if (detail is null)
            CreateStderr().MarkupLine($"  [bold yellow]![/] {Markup.Escape(label)}");
        else
            CreateStderr().MarkupLine($"  [bold yellow]![/] {Markup.Escape(label)} [grey]{Markup.Escape(detail)}[/]");
    }
}
