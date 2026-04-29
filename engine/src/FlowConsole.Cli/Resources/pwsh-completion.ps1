# PowerShell completion for fcon (FlowConsole CLI)

Register-ArgumentCompleter -Native -CommandName fcon -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $commands = @{
        'scan'       = 'Scan source code to produce ModelSnapshot'
        'validate'   = 'Run validation rules'
        'fmt'        = 'Normalize ModelSnapshot JSON'
        'init'       = 'Scaffold a new FlowConsole project'
        'doctor'     = 'Run health checks'
        'rules'      = 'Manage validation rules'
        'explain'    = 'Explain a rule or finding'
        'completion' = 'Generate shell completion scripts'
        'push'       = 'Push data to FlowConsole server'
        'diff'       = 'Compare two ModelSnapshots'
        'view'       = 'Start a local viewer for a ModelSnapshot'
        'telemetry'  = 'Manage anonymous telemetry'
    }

    $elements = $commandAst.CommandElements
    $command = $null

    for ($i = 1; $i -lt $elements.Count; $i++) {
        $element = $elements[$i].ToString()
        if ($commands.ContainsKey($element)) {
            $command = $element
            break
        }
    }

    if ($null -eq $command) {
        # Complete commands and global options
        $commands.GetEnumerator() | Where-Object { $_.Key -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_.Key, $_.Key, 'ParameterValue', $_.Value)
        }
        @('--version', '--help', '--config', '--no-color', '--verbose', '--no-telemetry') |
            Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterName', $_)
            }
        return
    }

    $options = switch ($command) {
        'scan'       { @('--output', '-o', '--scanner', '--merge-with', '--strict', '--help') }
        'validate'   { @('--fail-on', '--format', '--output', '-o', '--watch', '--include-trace', '--help') }
        'fmt'        { @('--output', '-o', '--check', '--indent', '--help') }
        'init'       { @('--with-examples', '--force', '--update-readme', '--help') }
        'doctor'     { @('--verbose', '--help') }
        'rules'      { @('list', 'export', '--help') }
        'explain'    { @('--help') }
        'completion' { @('bash', 'zsh', 'fish', 'pwsh', '--help') }
        'view'       { @('--port', '--no-open', '--source', '--max-snapshot-bytes', '--help') }
        default      { @('--help') }
    }

    $options | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
        [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
    }
}
