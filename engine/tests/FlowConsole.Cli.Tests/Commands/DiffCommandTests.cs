using System.Text.Json;
using FlowConsole.Cli.Commands;

namespace FlowConsole.Cli.Tests.Commands;

[Collection(ConsoleTestCollection.Name)]
public sealed class DiffCommandTests : IDisposable
{
    private readonly string _tempDir;
    private readonly DiffCommand _command = new();

    public DiffCommandTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"fc-diff-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempDir, true); } catch { }
    }

    [Fact]
    public void AddedElement_ShowsInDiff()
    {
        var before = WriteSnapshot("before.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "User Service", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var after = WriteSnapshot("after.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "User Service", "source": "CodeScan" },
                { "id": "svc-2", "kind": "Service", "name": "Notification Service", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var stdout = CaptureStdout(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(before, after));
            code.Should().Be(0);
        });

        stdout.Should().Contain("Notification Service");
        stdout.Should().Contain("+");
    }

    [Fact]
    public void RemovedRelationship_ShowsInDiff()
    {
        var before = WriteSnapshot("before.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "svc-2", "kind": "Service", "name": "B", "source": "CodeScan" }
            ],
            "relationships": [
                { "sourceId": "svc-1", "targetId": "svc-2", "kind": "Uses" }
            ]
        }
        """);

        var after = WriteSnapshot("after.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "svc-2", "kind": "Service", "name": "B", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var stdout = CaptureStdout(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(before, after));
            code.Should().Be(0);
        });

        stdout.Should().Contain("-");
        stdout.Should().Contain("svc-1");
        stdout.Should().Contain("svc-2");
        stdout.Should().Contain("Uses");
    }

    [Fact]
    public void ChangedTechnologyField_ShowsFieldChanges()
    {
        var before = WriteSnapshot("before.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "User Service", "technology": "Node.js", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var after = WriteSnapshot("after.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "User Service", "technology": "Go", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var stdout = CaptureStdout(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(before, after));
            code.Should().Be(0);
        });

        stdout.Should().Contain("~");
        stdout.Should().Contain("technology");
        stdout.Should().Contain("Node.js");
        stdout.Should().Contain("Go");
    }

    [Fact]
    public void OnlyAdded_FiltersOutput()
    {
        var before = WriteSnapshot("before.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "Old Service", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var after = WriteSnapshot("after.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-2", "kind": "Service", "name": "New Service", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var stdout = CaptureStdout(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(before, after, only: "added"));
            code.Should().Be(0);
        });

        // Should show added element but not removed
        stdout.Should().Contain("New Service");
        stdout.Should().NotContain("Old Service");
    }

    [Fact]
    public void MarkdownFormat_ProducesPRReadyOutput()
    {
        var before = WriteSnapshot("before.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [],
            "relationships": []
        }
        """);

        var after = WriteSnapshot("after.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "New Service", "technology": "Go", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var stdout = CaptureStdout(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(before, after, format: "markdown"));
            code.Should().Be(0);
        });

        stdout.Should().Contain("## Architecture Diff");
        stdout.Should().Contain("### Added");
        stdout.Should().Contain("| Kind | Name | Technology |");
        stdout.Should().Contain("| Service | New Service | Go |");
        stdout.Should().Contain("**Summary:**");
    }

    [Fact]
    public void JsonFormat_ValidatesAgainstDiffSchema()
    {
        var before = WriteSnapshot("before.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var after = WriteSnapshot("after.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "technology": "Rust", "source": "CodeScan" },
                { "id": "svc-2", "kind": "Database", "name": "B", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var stdout = CaptureStdout(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(before, after, format: "json"));
            code.Should().Be(0);
        });

        // Validate it's valid JSON with expected structure
        var doc = JsonDocument.Parse(stdout);
        var root = doc.RootElement;
        root.TryGetProperty("added", out _).Should().BeTrue();
        root.TryGetProperty("removed", out _).Should().BeTrue();
        root.TryGetProperty("changed", out _).Should().BeTrue();

        // added should have svc-2
        var addedElements = root.GetProperty("added").GetProperty("elements");
        addedElements.GetArrayLength().Should().Be(1);
        addedElements[0].GetProperty("id").GetString().Should().Be("svc-2");

        // changed should have svc-1 with technology fieldChange
        var changedElements = root.GetProperty("changed").GetProperty("elements");
        changedElements.GetArrayLength().Should().Be(1);
        changedElements[0].GetProperty("fieldChanges").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public void IdenticalSnapshots_EmptyDiff_ExitCode0()
    {
        var snapshot = WriteSnapshot("snapshot.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var stderr = CaptureStderr(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(snapshot, snapshot));
            code.Should().Be(0);
        });

        stderr.Should().Contain("No differences found");
    }

    [Fact]
    public void EmptyToFull_AllAdded()
    {
        var empty = WriteSnapshot("empty.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [],
            "relationships": []
        }
        """);

        var full = WriteSnapshot("full.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "svc-2", "kind": "Service", "name": "B", "source": "CodeScan" }
            ],
            "relationships": [
                { "sourceId": "svc-1", "targetId": "svc-2", "kind": "Uses" }
            ]
        }
        """);

        var stdout = CaptureStdout(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(empty, full, format: "json"));
            code.Should().Be(0);
        });
        var doc = JsonDocument.Parse(stdout);
        doc.RootElement.GetProperty("added").GetProperty("elements").GetArrayLength().Should().Be(2);
        doc.RootElement.GetProperty("added").GetProperty("relationships").GetArrayLength().Should().Be(1);
        doc.RootElement.GetProperty("removed").GetProperty("elements").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public void FullToEmpty_AllRemoved()
    {
        var empty = WriteSnapshot("empty2.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [],
            "relationships": []
        }
        """);

        var full = WriteSnapshot("full2.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "svc-2", "kind": "Service", "name": "B", "source": "CodeScan" }
            ],
            "relationships": [
                { "sourceId": "svc-1", "targetId": "svc-2", "kind": "Uses" }
            ]
        }
        """);

        var stdout = CaptureStdout(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(full, empty, format: "json"));
            code.Should().Be(0);
        });
        var doc = JsonDocument.Parse(stdout);
        doc.RootElement.GetProperty("removed").GetProperty("elements").GetArrayLength().Should().Be(2);
        doc.RootElement.GetProperty("removed").GetProperty("relationships").GetArrayLength().Should().Be(1);
        doc.RootElement.GetProperty("added").GetProperty("elements").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public void MalformedJson_ReturnsExitCode2()
    {
        var badPath = Path.Combine(_tempDir, "bad.json");
        File.WriteAllText(badPath, "{ not valid json");

        var goodPath = WriteSnapshot("good.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [],
            "relationships": []
        }
        """);

        // Bad before file
        var code1 = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(badPath, goodPath));
        code1.Should().Be(2);

        // Bad after file
        var code2 = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(goodPath, badPath));
        code2.Should().Be(2);
    }

    [Fact]
    public void MissingFile_ReturnsExitCode2()
    {
        var goodPath = WriteSnapshot("good.json", """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [],
            "relationships": []
        }
        """);

        var code = _command.Execute(TestHelper.CreateContext("diff"),
            MakeSettings("/nonexistent/file.json", goodPath));
        code.Should().Be(2);
    }

    [Fact]
    public void InvalidFormat_ReturnsExitCode2()
    {
        var path = WriteSnapshot("snap.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [],
            "relationships": []
        }
        """);

        var code = _command.Execute(TestHelper.CreateContext("diff"),
            MakeSettings(path, path, format: "xml"));
        code.Should().Be(2);
    }

    [Fact]
    public void InvalidOnlyValue_ReturnsExitCode2()
    {
        var path = WriteSnapshot("snap.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [],
            "relationships": []
        }
        """);

        var code = _command.Execute(TestHelper.CreateContext("diff"),
            MakeSettings(path, path, only: "invalid"));
        code.Should().Be(2);
    }

    [Fact]
    public void OutputToFile_WritesCorrectly()
    {
        var before = WriteSnapshot("before.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [],
            "relationships": []
        }
        """);

        var after = WriteSnapshot("after.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var outputPath = Path.Combine(_tempDir, "diff-output.json");
        var code = _command.Execute(TestHelper.CreateContext("diff"),
            MakeSettings(before, after, format: "json", outputPath: outputPath));

        code.Should().Be(0);
        File.Exists(outputPath).Should().BeTrue();
        var content = File.ReadAllText(outputPath);
        var doc = JsonDocument.Parse(content); // valid JSON
        doc.RootElement.TryGetProperty("added", out _).Should().BeTrue();
    }

    [Fact]
    public void ChangedRelationship_Technology_ShowsInHumanDiff()
    {
        var before = WriteSnapshot("before.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "db-1", "kind": "Database", "name": "DB", "source": "CodeScan" }
            ],
            "relationships": [
                { "sourceId": "svc-1", "targetId": "db-1", "kind": "Uses", "technology": "JDBC" }
            ]
        }
        """);

        var after = WriteSnapshot("after.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "db-1", "kind": "Database", "name": "DB", "source": "CodeScan" }
            ],
            "relationships": [
                { "sourceId": "svc-1", "targetId": "db-1", "kind": "Uses", "technology": "gRPC" }
            ]
        }
        """);

        var stdout = CaptureStdout(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(before, after));
            code.Should().Be(0);
        });

        stdout.Should().Contain("~");
        stdout.Should().Contain("technology");
        stdout.Should().Contain("JDBC");
        stdout.Should().Contain("gRPC");
    }

    [Fact]
    public void ChangedRelationship_MarkdownFormat_ShowsTable()
    {
        var before = WriteSnapshot("before.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "db-1", "kind": "Database", "name": "DB", "source": "CodeScan" }
            ],
            "relationships": [
                { "sourceId": "svc-1", "targetId": "db-1", "kind": "Uses", "technology": "JDBC" }
            ]
        }
        """);

        var after = WriteSnapshot("after.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "db-1", "kind": "Database", "name": "DB", "source": "CodeScan" }
            ],
            "relationships": [
                { "sourceId": "svc-1", "targetId": "db-1", "kind": "Uses", "technology": "gRPC" }
            ]
        }
        """);

        var stdout = CaptureStdout(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(before, after, format: "markdown"));
            code.Should().Be(0);
        });

        stdout.Should().Contain("### Changed");
        stdout.Should().Contain("| Source -> Target | Kind | Field | Before | After |");
        stdout.Should().Contain("svc-1 -> db-1");
        stdout.Should().Contain("JDBC");
        stdout.Should().Contain("gRPC");
    }

    [Fact]
    public void ChangedRelationship_JsonFormat_ShowsFieldChanges()
    {
        var before = WriteSnapshot("before.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "db-1", "kind": "Database", "name": "DB", "source": "CodeScan" }
            ],
            "relationships": [
                { "sourceId": "svc-1", "targetId": "db-1", "kind": "Uses", "label": "reads", "technology": "JDBC" }
            ]
        }
        """);

        var after = WriteSnapshot("after.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "db-1", "kind": "Database", "name": "DB", "source": "CodeScan" }
            ],
            "relationships": [
                { "sourceId": "svc-1", "targetId": "db-1", "kind": "Uses", "label": "writes", "technology": "gRPC" }
            ]
        }
        """);

        var stdout = CaptureStdout(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(before, after, format: "json"));
            code.Should().Be(0);
        });

        var doc = JsonDocument.Parse(stdout);
        var changed = doc.RootElement.GetProperty("changed");
        var changedRels = changed.GetProperty("relationships");
        changedRels.GetArrayLength().Should().Be(1);

        var rel = changedRels[0];
        rel.GetProperty("before").GetProperty("sourceId").GetString().Should().Be("svc-1");
        rel.GetProperty("after").GetProperty("technology").GetString().Should().Be("gRPC");
        rel.GetProperty("fieldChanges").GetArrayLength().Should().BeGreaterThan(1);
    }

    [Fact]
    public void MarkdownFormat_RemovedRelationships_ShowsTable()
    {
        var before = WriteSnapshot("before.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "svc-2", "kind": "Service", "name": "B", "source": "CodeScan" }
            ],
            "relationships": [
                { "sourceId": "svc-1", "targetId": "svc-2", "kind": "Uses" }
            ]
        }
        """);

        var after = WriteSnapshot("after.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "svc-2", "kind": "Service", "name": "B", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var stdout = CaptureStdout(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(before, after, format: "markdown"));
            code.Should().Be(0);
        });

        stdout.Should().Contain("### Removed");
        stdout.Should().Contain("| Source | Target | Kind |");
        stdout.Should().Contain("svc-1");
        stdout.Should().Contain("svc-2");
    }

    [Fact]
    public void MarkdownFormat_AddedRelationships_ShowsTable()
    {
        var before = WriteSnapshot("before.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "svc-2", "kind": "Service", "name": "B", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var after = WriteSnapshot("after.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "svc-2", "kind": "Service", "name": "B", "source": "CodeScan" }
            ],
            "relationships": [
                { "sourceId": "svc-1", "targetId": "svc-2", "kind": "DependsOn" }
            ]
        }
        """);

        var stdout = CaptureStdout(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(before, after, format: "markdown"));
            code.Should().Be(0);
        });

        stdout.Should().Contain("### Added");
        stdout.Should().Contain("| Source | Target | Kind |");
        stdout.Should().Contain("DependsOn");
    }

    [Fact]
    public void OnlyChanged_FiltersToChangedOnly()
    {
        var before = WriteSnapshot("before.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "technology": "Go", "source": "CodeScan" },
                { "id": "svc-2", "kind": "Service", "name": "B", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var after = WriteSnapshot("after.json", """
        {
            "$schema": "x",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "A", "technology": "Rust", "source": "CodeScan" },
                { "id": "svc-3", "kind": "Service", "name": "C", "source": "CodeScan" }
            ],
            "relationships": []
        }
        """);

        var stdout = CaptureStdout(() =>
        {
            var code = _command.Execute(TestHelper.CreateContext("diff"), MakeSettings(before, after, only: "changed"));
            code.Should().Be(0);
        });

        // Should show changed element but not added/removed
        stdout.Should().Contain("technology");
        stdout.Should().NotContain("C"); // svc-3 is added, should be filtered
        stdout.Should().NotContain("B"); // svc-2 is removed, should be filtered
    }

    private string WriteSnapshot(string name, string json)
    {
        var path = Path.Combine(_tempDir, name);
        File.WriteAllText(path, json);
        return path;
    }

    private static DiffSettings MakeSettings(
        string beforePath, string afterPath,
        string format = "human", string? only = null,
        string? outputPath = null) => new()
        {
            BeforePath = beforePath,
            AfterPath = afterPath,
            Format = format,
            Only = only,
            OutputPath = outputPath
        };

    private static string CaptureStdout(Action action)
    {
        var original = Console.Out;
        using var sw = new StringWriter();
        Console.SetOut(sw);
        try
        {
            action();
            return sw.ToString();
        }
        finally
        {
            Console.SetOut(original);
        }
    }

    private static string CaptureStderr(Action action)
    {
        var original = Console.Error;
        using var sw = new StringWriter();
        Console.SetError(sw);
        try
        {
            action();
            return sw.ToString();
        }
        finally
        {
            Console.SetError(original);
        }
    }
}
