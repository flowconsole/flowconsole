namespace FlowConsole.Core.Exceptions;

public sealed class LlmUnavailableException : Exception
{
    public LlmUnavailableException(string message) : base(message) { }
    public LlmUnavailableException(string message, Exception inner) : base(message, inner) { }
}
