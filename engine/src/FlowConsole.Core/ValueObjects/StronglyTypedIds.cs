namespace FlowConsole.Core.ValueObjects;

public readonly record struct ProjectId(Guid Value)
{
    public static ProjectId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}

public readonly record struct ModelId(Guid Value)
{
    public static ModelId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}

public readonly record struct ElementId(string Value)
{
    public override string ToString() => Value;
}

public readonly record struct RelationshipId(string Value)
{
    public override string ToString() => Value;
}

public readonly record struct MetaSchemaId(string Value)
{
    public override string ToString() => Value;
}

public readonly record struct ScanId(Guid Value)
{
    public static ScanId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}

public readonly record struct DriftSnapshotId(Guid Value)
{
    public static DriftSnapshotId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}

public readonly record struct ValidationRunId(Guid Value)
{
    public static ValidationRunId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}

public readonly record struct ValidationResultId(Guid Value)
{
    public static ValidationResultId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}

public readonly record struct AnalyticsSnapshotId(Guid Value)
{
    public static AnalyticsSnapshotId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}

public readonly record struct UserApiKeyId(Guid Value)
{
    public static UserApiKeyId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
