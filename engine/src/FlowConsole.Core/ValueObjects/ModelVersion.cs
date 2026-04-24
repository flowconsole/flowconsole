namespace FlowConsole.Core.ValueObjects;

public readonly record struct ModelVersion(int Value)
{
    public static ModelVersion Initial => new(1);

    public ModelVersion Increment() => new(Value + 1);

    public override string ToString() => Value.ToString();
}
