using System.Diagnostics.CodeAnalysis;
using Microsoft.Extensions.DependencyInjection;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Infrastructure;

/// <summary>
/// Bridges Microsoft.Extensions.DependencyInjection with Spectre.Console.Cli.
/// </summary>
internal sealed class TypeRegistrar : ITypeRegistrar
{
    private readonly IServiceCollection _services;
    private ServiceProvider? _provider;

    public TypeRegistrar(IServiceCollection services)
    {
        _services = services;
    }

    public ITypeResolver Build() =>
        new TypeResolver(_provider ?? _services.BuildServiceProvider());

#pragma warning disable IL2067 // Spectre.Console.Cli ITypeRegistrar does not annotate its parameters
    public void Register(Type service, Type implementation) =>
        _services.AddSingleton(service, implementation);
#pragma warning restore IL2067

    public void RegisterInstance(Type service, object implementation) =>
        _services.AddSingleton(service, implementation);

    public void RegisterLazy(Type service, Func<object> factory) =>
        _services.AddSingleton(service, _ => factory());

    /// <summary>
    /// Build the underlying ServiceProvider for direct service resolution
    /// (used by Program.cs to resolve telemetry services outside Spectre command pipeline).
    /// The same provider instance is reused when Spectre calls Build().
    /// </summary>
    public ServiceProvider BuildServiceProvider()
    {
        _provider ??= _services.BuildServiceProvider();
        return _provider;
    }
}

internal sealed class TypeResolver : ITypeResolver, IDisposable
{
    private readonly IServiceProvider _provider;

    public TypeResolver(IServiceProvider provider)
    {
        _provider = provider;
    }

    public object? Resolve(Type? type) =>
        type is null ? null : _provider.GetService(type);

    public void Dispose()
    {
        if (_provider is IDisposable disposable)
            disposable.Dispose();
    }
}
