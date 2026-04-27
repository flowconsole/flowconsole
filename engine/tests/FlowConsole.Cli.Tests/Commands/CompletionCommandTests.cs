using FlowConsole.Cli.Commands;

namespace FlowConsole.Cli.Tests.Commands;

[Collection(ConsoleTestCollection.Name)]
public sealed class CompletionCommandTests
{
    [Theory]
    [InlineData("bash", "complete -F")]
    [InlineData("zsh", "#compdef fc")]
    [InlineData("fish", "complete -c fc")]
    [InlineData("pwsh", "Register-ArgumentCompleter")]
    public void Completion_PrintsValidScript(string shell, string expectedSignature)
    {
        var (exitCode, output) = RunCompletion(shell);

        exitCode.Should().Be(0);
        output.Should().Contain(expectedSignature,
            $"completion script for {shell} should contain {expectedSignature}");
    }

    [Fact]
    public void Completion_UnknownShell_ReturnsError()
    {
        var settings = new CompletionSettings { Shell = "unknown" };

        var errWriter = new StringWriter();
        var originalErr = Console.Error;
        Console.SetError(errWriter);

        try
        {
            var command = new CompletionCommand();
            var exitCode = command.Execute(
                TestHelper.CreateContext("completion"),
                settings);

            exitCode.Should().Be(2);
            errWriter.ToString().Should().Contain("Unknown shell");
        }
        finally
        {
            Console.SetError(originalErr);
        }
    }

    [Theory]
    [InlineData("BASH")]
    [InlineData("Bash")]
    [InlineData("ZSH")]
    public void Completion_CaseInsensitive(string shell)
    {
        var (exitCode, output) = RunCompletion(shell);

        exitCode.Should().Be(0);
        output.Should().NotBeNullOrEmpty();
    }

    [Theory]
    [InlineData("bash")]
    [InlineData("zsh")]
    [InlineData("fish")]
    [InlineData("pwsh")]
    public void Completion_ContainsFcCommands(string shell)
    {
        var (exitCode, output) = RunCompletion(shell);

        exitCode.Should().Be(0);
        output.Should().Contain("scan");
        output.Should().Contain("validate");
        output.Should().Contain("init");
        output.Should().Contain("doctor");
    }

    private static (int exitCode, string output) RunCompletion(string shell)
    {
        var settings = new CompletionSettings { Shell = shell };

        var writer = new StringWriter();
        var originalOut = Console.Out;
        Console.SetOut(writer);

        try
        {
            var command = new CompletionCommand();
            var exitCode = command.Execute(
                TestHelper.CreateContext("completion"),
                settings);
            return (exitCode, writer.ToString());
        }
        finally
        {
            Console.SetOut(originalOut);
        }
    }
}
