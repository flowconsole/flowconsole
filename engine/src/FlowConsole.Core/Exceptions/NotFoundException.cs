namespace FlowConsole.Core.Exceptions;

public class NotFoundException : DomainException
{
    public string EntityName { get; }
    public object Id { get; }

    public NotFoundException(string entityName, object id)
        : base($"{entityName} with id '{id}' was not found.")
    {
        EntityName = entityName;
        Id = id;
    }
}
