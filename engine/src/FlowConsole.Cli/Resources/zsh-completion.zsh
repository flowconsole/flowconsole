#compdef fcon

# zsh completion for fcon (FlowConsole CLI)

_fcon() {
    local -a commands
    commands=(
        'scan:Auto-detect and scan source code to produce ModelSnapshot'
        'validate:Run validation rules against a ModelSnapshot'
        'fmt:Normalize ModelSnapshot JSON (canonical key order)'
        'init:Scaffold a new FlowConsole project'
        'doctor:Run health checks on the FlowConsole environment'
        'rules:Manage validation rules'
        'explain:Explain a rule or finding in human-readable form'
        'completion:Generate shell completion scripts'
        'push:Push data to FlowConsole server'
        'diff:Compare two ModelSnapshots'
        'view:Start a local viewer for a ModelSnapshot'
        'telemetry:Manage anonymous telemetry'
    )

    _arguments -C \
        '--version[Print version]' \
        '--help[Show help]' \
        '--config[Path to .flowconsole.yaml]:config file:_files' \
        '--no-color[Disable ANSI colors]' \
        '--verbose[Debug logging to stderr]' \
        '--no-telemetry[Disable telemetry for this invocation]' \
        '1:command:->command' \
        '*::arg:->args'

    case $state in
        command)
            _describe -t commands 'fcon command' commands
            ;;
        args)
            case $words[1] in
                scan)
                    _arguments \
                        '(-o --output)'{-o,--output}'[Output file path]:output file:_files' \
                        '--scanner[Scanner to use]:scanner:(csharp)' \
                        '--merge-with[Merge with existing snapshot]:snapshot file:_files' \
                        '--strict[Fail on first parse error]' \
                        '*:input:_files'
                    ;;
                validate)
                    _arguments \
                        '--fail-on[Minimum severity to fail]:severity:(warning error)' \
                        '--format[Output format]:format:(human json sarif junit)' \
                        '(-o --output)'{-o,--output}'[Output file path]:output file:_files' \
                        '--watch[Re-run on file changes]' \
                        '--include-trace[Include expression trace in output]' \
                        '*:input:_files'
                    ;;
                fmt)
                    _arguments \
                        '(-o --output)'{-o,--output}'[Output file path]:output file:_files' \
                        '--check[Check if normalized (exit 1 if not)]' \
                        '--indent[Indentation]:indent:(2 4 tab)' \
                        '*:input:_files'
                    ;;
                init)
                    _arguments \
                        '--with-examples[Add example snapshot and rules]' \
                        '--force[Overwrite existing files]' \
                        '--update-readme[Append quickstart hints to README.md]' \
                        '*:directory:_directories'
                    ;;
                doctor)
                    _arguments \
                        '--verbose[Show detailed resolution steps]'
                    ;;
                rules)
                    local -a subcommands
                    subcommands=(
                        'list:List available rules'
                        'export:Export built-in rules to directory'
                    )
                    _describe -t subcommands 'rules subcommand' subcommands
                    ;;
                completion)
                    _arguments \
                        '1:shell:(bash zsh fish pwsh)'
                    ;;
                view)
                    _arguments \
                        '--port[Port to bind]:port:' \
                        '--no-open[Do not open browser]' \
                        '--source[Snapshot source filter]:source:(auto scan synth)' \
                        '--max-snapshot-bytes[Maximum snapshot file size in bytes]:bytes:' \
                        '*:snapshot:_files -g "*.json"'
                    ;;
            esac
            ;;
    esac
}

_fcon "$@"
