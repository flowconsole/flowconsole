namespace FlowConsole.Core.Exceptions;

public class ConflictException : DomainException
{
    public ConflictException(string message) : base(message) { }
}
