#!/usr/bin/env bash
# bash completion for fc (FlowConsole CLI)

_fc_completions()
{
    local cur prev commands
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    commands="scan validate fmt init doctor rules explain completion push diff telemetry"

    case "${prev}" in
        fc)
            COMPREPLY=( $(compgen -W "${commands} --version --help --config --no-color --verbose --no-telemetry" -- "${cur}") )
            return 0
            ;;
        scan)
            COMPREPLY=( $(compgen -W "--output -o --scanner --merge-with --strict --help" -- "${cur}") )
            return 0
            ;;
        validate)
            COMPREPLY=( $(compgen -W "--fail-on --format --output -o --watch --include-trace --help" -- "${cur}") )
            return 0
            ;;
        fmt)
            COMPREPLY=( $(compgen -W "--output -o --check --indent --help" -- "${cur}") )
            return 0
            ;;
        init)
            COMPREPLY=( $(compgen -W "--with-examples --force --update-readme --help" -- "${cur}") )
            return 0
            ;;
        doctor)
            COMPREPLY=( $(compgen -W "--verbose --help" -- "${cur}") )
            return 0
            ;;
        rules)
            COMPREPLY=( $(compgen -W "list export --help" -- "${cur}") )
            return 0
            ;;
        explain)
            COMPREPLY=( $(compgen -W "--help" -- "${cur}") )
            return 0
            ;;
        completion)
            COMPREPLY=( $(compgen -W "bash zsh fish pwsh --help" -- "${cur}") )
            return 0
            ;;
        --scanner)
            COMPREPLY=( $(compgen -W "csharp" -- "${cur}") )
            return 0
            ;;
        --format)
            COMPREPLY=( $(compgen -W "human json sarif junit" -- "${cur}") )
            return 0
            ;;
        --fail-on)
            COMPREPLY=( $(compgen -W "warning error" -- "${cur}") )
            return 0
            ;;
        --indent)
            COMPREPLY=( $(compgen -W "2 4 tab" -- "${cur}") )
            return 0
            ;;
    esac

    # Default to file completion
    COMPREPLY=( $(compgen -f -- "${cur}") )
}

complete -F _fc_completions fc
