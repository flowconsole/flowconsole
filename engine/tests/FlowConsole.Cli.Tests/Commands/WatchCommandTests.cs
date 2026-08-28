using System.Net;
using System.Text.RegularExpressions;
using FlowConsole.Cli.Commands;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Synth;
using FluentAssertions;
using Xunit;

namespace FlowConsole.Cli.Tests.Commands;

[Collection(ConsoleTestCollection.Name)]
public sealed class WatchCommandTests : IDisposable
{
    private readonly string _tempRoot;

    private const string ValidSnapshot = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.1.0",
          "source": "Git",
          "elements": [{ "id": "svc", "kind": "Service", "name": "Svc", "source": "Git" }],
          "relationships": []
        }
        """;

    public WatchCommandTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"fc-watch-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
    }

    [Fact]
    public async Task Watch_NoBuildCommandConfigured_ExitsTwo_WithHint()
    {
        var projectDir = CreateProjectDir("no-config");

        var (exitCode, _, stderr) = await RunWatchToCompletion(projectDir, command: null);

        exitCode.Should().Be(2);
        stderr.Should().Contain("build.command not configured");
    }

    [Fact]
    public async Task Watch_NonexistentCwd_ExitsTwo()
    {
        var projectDir = CreateProjectDir("bad-cwd");
        CreateConfig(projectDir, command: "echo '{}'");

        var (exitCode, _, stderr) = await RunWatchToCompletion(
            projectDir, command: "echo '{}'", cwd: Path.Combine(_tempRoot, "missing"));

        exitCode.Should().Be(2);
        stderr.Should().Contain("working directory does not exist");
    }

    [Fact]
    public async Task Watch_FailingInitialBuild_NoSnapshot_ExitsThree()
    {
        var projectDir = CreateProjectDir("fail-initial");
        CreateConfig(projectDir, command: "exit 1");

        var (exitCode, _, _) = await RunWatchToCompletion(projectDir, command: null);

        exitCode.Should().Be(3);
    }

    [Fact]
    public async Task Watch_InitialBuildSucceeds_ServesViewer_ExitsZeroOnCancel()
    {
        var projectDir = CreateProjectDir("happy");
        var snapshotFile = WriteSnapshotSource(projectDir);
        CreateConfig(projectDir, command: $"cat {snapshotFile}");

        var snapshotPath = Path.Combine(projectDir, ".flowconsole", "snapshots", "latest.json");

        using var session = await StartWatchAsync(projectDir);

        session.SnapshotAppeared(TimeSpan.FromSeconds(10)).Should().BeTrue();
        session.Listening.Should().BeTrue("viewer must be listening");

        await session.CancelAsync();
        session.ExitCode.Should().Be(0);
        session.Stderr.Should().Contain("Watching");
    }

    [Fact]
    public async Task Watch_ViewerServesStatusAndSnapshot()
    {
        var projectDir = CreateProjectDir("status");
        var snapshotFile = WriteSnapshotSource(projectDir);
        CreateConfig(projectDir, command: $"cat {snapshotFile}");

        using var session = await StartWatchAsync(projectDir);

        session.SnapshotAppeared(TimeSpan.FromSeconds(10)).Should().BeTrue();
        session.Listening.Should().BeTrue();

        using var client = new HttpClient();
        var status = await client.GetAsync($"{session.Url}/api/status");
        status.StatusCode.Should().Be(HttpStatusCode.OK);
        (await status.Content.ReadAsStringAsync()).Should().Contain("\"state\"");

        var snapshot = await client.GetAsync($"{session.Url}/api/snapshot");
        snapshot.StatusCode.Should().Be(HttpStatusCode.OK);
        (await snapshot.Content.ReadAsStringAsync()).Should().Contain("elements");

        var root = await client.GetAsync($"{session.Url}/");
        root.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);

        await session.CancelAsync();
        session.ExitCode.Should().Be(0);
    }

    [Fact]
    public async Task Watch_SourceChange_TriggersDebouncedRebuild()
    {
        var projectDir = CreateProjectDir("rebuild");
        var counter = Path.Combine(projectDir, "counter.txt");
        File.WriteAllText(counter, ValidSnapshot);
        CreateConfig(projectDir, command: $"cat {counter}");

        var snapshotPath = Path.Combine(projectDir, ".flowconsole", "snapshots", "latest.json");

        using var session = await StartWatchAsync(projectDir);
        session.SnapshotAppeared(TimeSpan.FromSeconds(10)).Should().BeTrue();

        var before = File.GetLastWriteTimeUtc(snapshotPath);

        var updatedSnapshot = ValidSnapshot.Replace("\"name\": \"Svc\"", "\"name\": \"Svc v2\"");
        File.WriteAllText(counter, updatedSnapshot);
        File.WriteAllText(Path.Combine(projectDir, "Builder.cs"), "// touch");

        var rebuilt = WaitFor(
            () => File.GetLastWriteTimeUtc(snapshotPath) > before,
            TimeSpan.FromSeconds(15));

        await session.CancelAsync();
        rebuilt.Should().BeTrue("a source change should trigger a debounced rebuild");
    }

    [Fact]
    public async Task Watch_BinObjOutputs_DoNotTriggerRebuild()
    {
        var projectDir = CreateProjectDir("no-feedback");
        var counter = Path.Combine(projectDir, "counter.txt");
        File.WriteAllText(counter, ValidSnapshot);
        CreateConfig(projectDir, command: $"cat {counter}");

        var snapshotPath = Path.Combine(projectDir, ".flowconsole", "snapshots", "latest.json");

        using var session = await StartWatchAsync(projectDir);
        session.SnapshotAppeared(TimeSpan.FromSeconds(10)).Should().BeTrue();

        var before = File.GetLastWriteTimeUtc(snapshotPath);

        var binDir = Path.Combine(projectDir, "bin", "Debug");
        Directory.CreateDirectory(binDir);
        File.WriteAllText(Path.Combine(binDir, "output.dll"), "binary");

        await Task.Delay(1500);
        var rebuilt = File.GetLastWriteTimeUtc(snapshotPath) > before;

        await session.CancelAsync();
        rebuilt.Should().BeFalse("writes under bin/ must not trigger a rebuild");
    }

    [Fact]
    public async Task Watch_FailingRebuild_MidSession_ProcessSurvives()
    {
        var projectDir = CreateProjectDir("fail-mid");
        var mode = Path.Combine(projectDir, "mode.txt");
        var counter = Path.Combine(projectDir, "counter.txt");
        File.WriteAllText(mode, "good");
        File.WriteAllText(counter, ValidSnapshot);
        CreateConfig(projectDir, command: $"cat {counter} && grep -q ^good {mode}");

        var snapshotPath = Path.Combine(projectDir, ".flowconsole", "snapshots", "latest.json");

        using var session = await StartWatchAsync(projectDir);
        session.SnapshotAppeared(TimeSpan.FromSeconds(10)).Should().BeTrue();

        File.WriteAllText(mode, "bad");
        File.WriteAllText(Path.Combine(projectDir, "Builder.cs"), "// touch broken");

        // Give the debounced failing rebuild time to run; the session must keep serving.
        await Task.Delay(2000);

        using var client = new HttpClient();
        var snapshot = await client.GetAsync($"{session.Url}/api/snapshot");
        snapshot.StatusCode.Should().Be(HttpStatusCode.OK,
            "the last valid snapshot must remain served after a failing rebuild");

        var status = await client.GetAsync($"{session.Url}/api/status");
        status.StatusCode.Should().Be(HttpStatusCode.OK);
        (await status.Content.ReadAsStringAsync()).Should().Contain("build-failed",
            "the status endpoint must report the failed rebuild");

        await session.CancelAsync();
        session.ExitCode.Should().Be(0);
    }

    [Fact]
    public async Task Watch_CancelDuringInitialBuild_ExitsZero()
    {
        var projectDir = CreateProjectDir("cancel-initial");
        var release = Path.Combine(projectDir, "release.flag");
        CreateConfig(projectDir, command: $"while [ ! -f {release} ]; do sleep 0.1; done; exit 1");

        var snapshotPath = Path.Combine(projectDir, ".flowconsole", "snapshots", "latest.json");

        var handle = new WatchSessionHandle(projectDir, this);
        var exitCode = await handle.RunCancelledDuringInitialBuildAsync();

        File.WriteAllText(release, "go");

        exitCode.Should().Be(0, "Ctrl+C during the initial build must exit gracefully, not crash");
        File.Exists(snapshotPath).Should().BeFalse();
    }

    private async Task<WatchSessionHandle> StartWatchAsync(string projectDir)
    {
        var handle = new WatchSessionHandle(projectDir, this);
        await handle.StartAsync();
        return handle;
    }

    private Task<(int exitCode, string stdout, string stderr)> RunWatchToCompletion(
        string projectDir,
        string? command,
        string? cwd = null)
    {
        var holder = new WatchSessionHandle(projectDir, this, cwd);
        return holder.RunToCompletionAsync(command);
    }

    internal sealed class WatchSessionHandle : IDisposable
    {
        private static readonly Regex UrlRegex = new(@"Listening on (http://\S+)", RegexOptions.Compiled);

        private readonly WatchCommandTests _owner;
        private readonly string _projectDir;
        private readonly string? _cwdOverride;
        private readonly CancellationTokenSource _cts = new();
        private readonly TaskCompletionSource _listening = new(TaskCreationOptions.RunContinuationsAsynchronously);

        private Task<int>? _execution;
        private StringWriter? _stdoutWriter;
        private StringWriter? _stderrWriter;
        private string _stdout = "";
        private string _stderr = "";
        private int _exitCode;

        public WatchSessionHandle(string projectDir, WatchCommandTests owner, string? cwdOverride = null)
        {
            _projectDir = projectDir;
            _owner = owner;
            _cwdOverride = cwdOverride;
        }

        public bool Listening => _listening.Task.IsCompleted;

        public string Url
        {
            get
            {
                var match = UrlRegex.Match(_stderr);
                match.Success.Should().BeTrue("Listening line expected in stderr");
                return match.Groups[1].Value;
            }
        }

        public string Stdout => _stdoutWriter?.ToString() ?? _stdout;

        public string Stderr => _stderrWriter?.ToString() ?? _stderr;

        public int ExitCode => _exitCode;

        public async Task StartAsync()
        {
            var atomicWriter = new AtomicFileWriter();
            var outputRouter = new OutputRouter(atomicWriter);
            var ctHolder = new CancellationTokenHolder(_cts.Token);
            var shellRunner = new ShellOutRunner();
            var browserLauncher = new FlowConsole.Cli.Hosting.BrowserLauncher();

            var watchCommand = new WatchCommand(
                atomicWriter, outputRouter, ctHolder, shellRunner, browserLauncher);
            var context = TestHelper.CreateContext("watch");

            var originalDir = Directory.GetCurrentDirectory();
            Directory.SetCurrentDirectory(_projectDir);

            var settings = new WatchSettings
            {
                Path = _projectDir,
                Cwd = _cwdOverride ?? _projectDir,
                NoOpen = true,
                DebounceMs = 200,
            };

            var stdoutWriter = new StringWriter();
            var stderrWriter = new StringWriter();
            _stdoutWriter = stdoutWriter;
            _stderrWriter = stderrWriter;
            var originalOut = Console.Out;
            var originalErr = Console.Error;

            Console.SetOut(stdoutWriter);
            Console.SetError(stderrWriter);
            try
            {
                _execution = RunAndCaptureAsync(watchCommand, context, settings, stdoutWriter, stderrWriter);

                WaitFor(() => UrlRegex.IsMatch(stderrWriter.ToString()), TimeSpan.FromSeconds(20));
                _stderr = stderrWriter.ToString();
                _stdout = stdoutWriter.ToString();
                _listening.TrySetResult();
            }
            finally
            {
                Console.SetOut(originalOut);
                Console.SetError(originalErr);
                Directory.SetCurrentDirectory(originalDir);
            }
        }

        public async Task<int> RunCancelledDuringInitialBuildAsync()
        {
            var atomicWriter = new AtomicFileWriter();
            var outputRouter = new OutputRouter(atomicWriter);
            var ctHolder = new CancellationTokenHolder(_cts.Token);
            var shellRunner = new ShellOutRunner();
            var browserLauncher = new FlowConsole.Cli.Hosting.BrowserLauncher();

            var watchCommand = new WatchCommand(
                atomicWriter, outputRouter, ctHolder, shellRunner, browserLauncher);
            var context = TestHelper.CreateContext("watch");

            var originalDir = Directory.GetCurrentDirectory();
            Directory.SetCurrentDirectory(_projectDir);

            var settings = new WatchSettings
            {
                Path = _projectDir,
                NoOpen = true,
            };

            var stderrWriter = new StringWriter();
            var originalErr = Console.Error;

            Console.SetError(stderrWriter);
            try
            {
                var execution = watchCommand.ExecuteAsync(context, settings);

                // Cancel while the initial build is still spinning in its wait loop.
                await Task.Delay(1500);
                _cts.Cancel();

                return await execution.WaitAsync(TimeSpan.FromSeconds(30));
            }
            finally
            {
                Console.SetError(originalErr);
                Directory.SetCurrentDirectory(originalDir);
            }
        }

        public async Task<(int, string, string)> RunToCompletionAsync(string? command)
        {
            var atomicWriter = new AtomicFileWriter();
            var outputRouter = new OutputRouter(atomicWriter);
            var ctHolder = new CancellationTokenHolder(_cts.Token);
            var shellRunner = new ShellOutRunner();
            var browserLauncher = new FlowConsole.Cli.Hosting.BrowserLauncher();

            var watchCommand = new WatchCommand(
                atomicWriter, outputRouter, ctHolder, shellRunner, browserLauncher);
            var context = TestHelper.CreateContext("watch");

            var originalDir = Directory.GetCurrentDirectory();
            Directory.SetCurrentDirectory(_projectDir);

            var settings = new WatchSettings
            {
                Path = _projectDir,
                Command = command,
                Cwd = _cwdOverride ?? _projectDir,
                NoOpen = true,
            };

            var stdoutWriter = new StringWriter();
            var stderrWriter = new StringWriter();
            var originalOut = Console.Out;
            var originalErr = Console.Error;

            Console.SetOut(stdoutWriter);
            Console.SetError(stderrWriter);
            try
            {
                var exitCode = await watchCommand.ExecuteAsync(context, settings);
                return (exitCode, stdoutWriter.ToString(), stderrWriter.ToString());
            }
            finally
            {
                Console.SetOut(originalOut);
                Console.SetError(originalErr);
                Directory.SetCurrentDirectory(originalDir);
            }
        }

        public bool SnapshotAppeared(TimeSpan timeout)
        {
            var snapshotPath = Path.Combine(_projectDir, ".flowconsole", "snapshots", "latest.json");
            return WaitFor(() => File.Exists(snapshotPath), timeout);
        }

        public async Task CancelAsync()
        {
            _cts.Cancel();
            if (_execution is not null)
            {
                _exitCode = await _execution.WaitAsync(TimeSpan.FromSeconds(30));
            }
        }

        private async Task<int> RunAndCaptureAsync(
            WatchCommand command,
            CommandContext context,
            WatchSettings settings,
            StringWriter stdoutWriter,
            StringWriter stderrWriter)
        {
            try
            {
                return await command.ExecuteAsync(context, settings);
            }
            finally
            {
                _stdout = stdoutWriter.ToString();
                _stderr = stderrWriter.ToString();
            }
        }

        public void Dispose()
        {
            _cts.Cancel();
            _cts.Dispose();
        }
    }

    private static bool WaitFor(Func<bool> condition, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (DateTime.UtcNow < deadline)
        {
            try
            {
                if (condition())
                    return true;
            }
            catch (IOException)
            {
            }
            Thread.Sleep(50);
        }
        return condition();
    }

    private string CreateProjectDir(string name)
    {
        var dir = Path.Combine(_tempRoot, name);
        Directory.CreateDirectory(dir);
        return dir;
    }

    private static void CreateConfig(string dir, string? command)
    {
        var yaml = "# FlowConsole configuration\n";
        if (command is not null)
        {
            yaml += "build:\n";
            yaml += $"  command: \"{command}\"\n";
        }
        File.WriteAllText(Path.Combine(dir, ".flowconsole.yaml"), yaml);
    }

    private string WriteSnapshotSource(string projectDir)
    {
        var sourceFile = Path.Combine(projectDir, "snapshot-source.txt");
        File.WriteAllText(sourceFile, ValidSnapshot);
        return sourceFile;
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempRoot, recursive: true); }
        catch { /* best-effort */ }
    }
}
