# fish completion for fcon (FlowConsole CLI)

# Disable file completions by default
complete -c fcon -f

# Global options
complete -c fcon -l version -d 'Print version'
complete -c fcon -l help -d 'Show help'
complete -c fcon -l config -r -d 'Path to .flowconsole.yaml'
complete -c fcon -l no-color -d 'Disable ANSI colors'
complete -c fcon -l verbose -d 'Debug logging to stderr'
complete -c fcon -l no-telemetry -d 'Disable telemetry'

# Subcommands
complete -c fcon -n '__fish_use_subcommand' -a scan -d 'Scan source code to produce ModelSnapshot'
complete -c fcon -n '__fish_use_subcommand' -a validate -d 'Run validation rules'
complete -c fcon -n '__fish_use_subcommand' -a fmt -d 'Normalize ModelSnapshot JSON'
complete -c fcon -n '__fish_use_subcommand' -a init -d 'Scaffold a new FlowConsole project'
complete -c fcon -n '__fish_use_subcommand' -a doctor -d 'Run health checks'
complete -c fcon -n '__fish_use_subcommand' -a rules -d 'Manage validation rules'
complete -c fcon -n '__fish_use_subcommand' -a explain -d 'Explain a rule or finding'
complete -c fcon -n '__fish_use_subcommand' -a completion -d 'Generate shell completion scripts'
complete -c fcon -n '__fish_use_subcommand' -a push -d 'Push data to FlowConsole server'
complete -c fcon -n '__fish_use_subcommand' -a diff -d 'Compare two ModelSnapshots'
complete -c fcon -n '__fish_use_subcommand' -a telemetry -d 'Manage anonymous telemetry'

# scan options
complete -c fcon -n '__fish_seen_subcommand_from scan' -s o -l output -r -d 'Output file path'
complete -c fcon -n '__fish_seen_subcommand_from scan' -l scanner -r -a 'csharp' -d 'Scanner to use'
complete -c fcon -n '__fish_seen_subcommand_from scan' -l merge-with -r -d 'Merge with existing snapshot'
complete -c fcon -n '__fish_seen_subcommand_from scan' -l strict -d 'Fail on first parse error'

# validate options
complete -c fcon -n '__fish_seen_subcommand_from validate' -l fail-on -r -a 'warning error' -d 'Minimum severity to fail'
complete -c fcon -n '__fish_seen_subcommand_from validate' -l format -r -a 'human json sarif junit' -d 'Output format'
complete -c fcon -n '__fish_seen_subcommand_from validate' -s o -l output -r -d 'Output file path'
complete -c fcon -n '__fish_seen_subcommand_from validate' -l watch -d 'Re-run on file changes'
complete -c fcon -n '__fish_seen_subcommand_from validate' -l include-trace -d 'Include expression trace'

# fmt options
complete -c fcon -n '__fish_seen_subcommand_from fmt' -s o -l output -r -d 'Output file path'
complete -c fcon -n '__fish_seen_subcommand_from fmt' -l check -d 'Check if normalized'
complete -c fcon -n '__fish_seen_subcommand_from fmt' -l indent -r -a '2 4 tab' -d 'Indentation'

# init options
complete -c fcon -n '__fish_seen_subcommand_from init' -l with-examples -d 'Add example snapshot and rules'
complete -c fcon -n '__fish_seen_subcommand_from init' -l force -d 'Overwrite existing files'
complete -c fcon -n '__fish_seen_subcommand_from init' -l update-readme -d 'Append quickstart to README.md'

# doctor options
complete -c fcon -n '__fish_seen_subcommand_from doctor' -l verbose -d 'Show detailed resolution steps'

# rules subcommands
complete -c fcon -n '__fish_seen_subcommand_from rules' -a list -d 'List available rules'
complete -c fcon -n '__fish_seen_subcommand_from rules' -a export -d 'Export built-in rules'

# completion shells
complete -c fcon -n '__fish_seen_subcommand_from completion' -a 'bash zsh fish pwsh' -d 'Shell type'
