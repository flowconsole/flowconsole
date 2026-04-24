using FluentResults;

namespace FlowConsole.Shared.Results;

public static class ResultExtensions
{
    public static Result<T> ToNotFoundResult<T>(string entityName, object id) =>
        Result.Fail<T>(new NotFoundError(entityName, id));

    public static Result<T> ToConflictResult<T>(string message) =>
        Result.Fail<T>(new ConflictError(message));
}

public class NotFoundError : Error
{
    public string EntityName { get; }
    public object Id { get; }

    public NotFoundError(string entityName, object id)
        : base($"{entityName} with id '{id}' was not found.")
    {
        EntityName = entityName;
        Id = id;
    }
}

public class ConflictError : Error
{
    public ConflictError(string message) : base(message) { }
}
