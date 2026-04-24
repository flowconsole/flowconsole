using Cel;
using Cel.Checker;
using Cel.Common.Types.Json;
using Cel.Common.Types.Ref;
using FlowConsole.Rules.Core.Bindings;
using Google.Api.Expr.V1Alpha1;
using Type = Google.Api.Expr.V1Alpha1.Type;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// Bridges FlowConsole binding types to Cel.NET type system.
/// </summary>
internal static class CelTypeAdapter
{
    /// <summary>
    /// Creates a Cel.NET Env configured with all helper function declarations
    /// and binding type declarations.
    /// </summary>
    public static Env CreateEnv(
        IReadOnlyDictionary<string, System.Type> availableBindings,
        HelperRegistry helperCatalog)
    {
        var registry = JsonRegistry.NewRegistry();

        // Register our domain types with the JSON registry
        registry.Register(typeof(ElementRef));
        registry.Register(typeof(RelationshipRef));
        registry.Register(typeof(DiffItem));
        registry.Register(typeof(FieldChange));
        registry.Register(typeof(PathRef));
        registry.Register(typeof(Stats));
        registry.Register(typeof(RuleRef));
        registry.Register(typeof(DriftDiff));

        var declarations = new List<Decl>();

        // Add variable declarations for each binding
        foreach (var (name, type) in availableBindings)
        {
            declarations.Add(Decls.NewVar(name, MapClrTypeToCelType(type)));
        }

        // Add helper function declarations
        AddHelperDeclarations(declarations, helperCatalog);

        var env = Env.NewCustomEnv(
            registry,
            new List<EnvOption>
            {
                LibraryOptions.StdLib(),
                EnvOptions.Declarations(declarations),
                EnvOptions.CustomTypeAdapter(registry.ToTypeAdapter()),
                EnvOptions.CustomTypeProvider(registry),
                EnvOptions.HomogeneousAggregateLiterals()
            });

        return env;
    }

    /// <summary>
    /// Maps a CLR type to a Cel.NET type declaration.
    /// </summary>
    internal static Type MapClrTypeToCelType(System.Type clrType)
    {
        if (clrType == typeof(bool))
            return Decls.NewPrimitiveType(Type.Types.PrimitiveType.Bool);
        if (clrType == typeof(int) || clrType == typeof(long))
            return Decls.NewPrimitiveType(Type.Types.PrimitiveType.Int64);
        if (clrType == typeof(double) || clrType == typeof(float))
            return Decls.NewPrimitiveType(Type.Types.PrimitiveType.Double);
        if (clrType == typeof(string))
            return Decls.NewPrimitiveType(Type.Types.PrimitiveType.String);

        if (clrType == typeof(ElementRef))
            return Decls.NewObjectType(typeof(ElementRef).FullName!);
        if (clrType == typeof(RelationshipRef))
            return Decls.NewObjectType(typeof(RelationshipRef).FullName!);
        if (clrType == typeof(DiffItem))
            return Decls.NewObjectType(typeof(DiffItem).FullName!);
        if (clrType == typeof(PathRef))
            return Decls.NewObjectType(typeof(PathRef).FullName!);
        if (clrType == typeof(Stats))
            return Decls.NewObjectType(typeof(Stats).FullName!);
        if (clrType == typeof(RuleRef))
            return Decls.NewObjectType(typeof(RuleRef).FullName!);
        if (clrType == typeof(DriftDiff))
            return Decls.NewObjectType(typeof(DriftDiff).FullName!);
        if (clrType == typeof(FieldChange))
            return Decls.NewObjectType(typeof(FieldChange).FullName!);

        // Generic list types
        if (clrType.IsGenericType)
        {
            var genDef = clrType.GetGenericTypeDefinition();
            if (genDef == typeof(IReadOnlyList<>) || genDef == typeof(List<>))
            {
                var elemType = clrType.GetGenericArguments()[0];
                return Decls.NewListType(MapClrTypeToCelType(elemType));
            }
            if (genDef == typeof(IReadOnlyDictionary<,>) || genDef == typeof(Dictionary<,>))
            {
                var args = clrType.GetGenericArguments();
                return Decls.NewMapType(MapClrTypeToCelType(args[0]), MapClrTypeToCelType(args[1]));
            }
        }

        // Default to DYN — use the proper protobuf Dyn type
        return DynType;
    }

    /// <summary>
    /// The CEL 'dyn' type — matches any type at compile time.
    /// Uses the protobuf Dyn oneof rather than NewObjectType("dyn").
    /// </summary>
    private static readonly Type DynType = new()
    {
        Dyn = new Google.Protobuf.WellKnownTypes.Empty()
    };

    // Collection helpers that need parameterized overloads to work with any list element type
    private static readonly HashSet<string> CollectionHelpers = ["count", "distinct"];

    // Lambda-only helpers (exists, all, any, none) are excluded from CEL declarations
    // because lambda syntax (x -> expr) is not supported in v1alpha1.
    // They remain in HelperRegistry for documentation and future use.
    private static readonly HashSet<string> LambdaOnlyHelpers = ["exists", "all", "any", "none"];

    private static void AddHelperDeclarations(List<Decl> declarations, HelperRegistry helperCatalog)
    {
        var helperNames = new[]
        {
            "count", "distinct",
            "neighbors", "incoming", "outgoing",
            "changed", "before", "after",
            "hasTag", "hasKind"
        };

        foreach (var name in helperNames)
        {
            var sigs = helperCatalog.GetSignatures(name);
            if (sigs.Count == 0) continue;

            var overloads = new List<Google.Api.Expr.V1Alpha1.Decl.Types.FunctionDecl.Types.Overload>();
            for (var i = 0; i < sigs.Count; i++)
            {
                var sig = sigs[i];

                // Skip lambda overloads — not supported in v1alpha1
                if (sig.Parameters.Any(p => p.IsLambda))
                    continue;

                var useParameterized = CollectionHelpers.Contains(name) && HasListParam(sig);

                var paramTypes = new List<Type>();
                foreach (var p in sig.Parameters)
                {
                    if (p.IsLambda)
                    {
                        // CEL doesn't have a lambda type in declarations — use DYN
                        paramTypes.Add(DynType);
                    }
                    else if (useParameterized && IsListOfObject(p.Type))
                    {
                        // Use list(T) with type param for collection helpers
                        paramTypes.Add(Decls.NewListType(Decls.NewTypeParamType("T")));
                    }
                    else
                    {
                        paramTypes.Add(MapClrTypeToCelType(p.Type));
                    }
                }

                var returnType = MapClrTypeToCelType(sig.ReturnType);
                if (useParameterized && IsListOfObject(sig.ReturnType))
                {
                    returnType = Decls.NewListType(Decls.NewTypeParamType("T"));
                }

                if (useParameterized)
                {
                    overloads.Add(Decls.NewParameterizedOverload(
                        $"{name}_overload_{i}",
                        paramTypes,
                        returnType,
                        new[] { "T" }));
                }
                else
                {
                    overloads.Add(Decls.NewOverload(
                        $"{name}_overload_{i}",
                        paramTypes,
                        returnType));
                }
            }

            // Skip functions with no remaining overloads (all were lambda-only)
            if (overloads.Count == 0) continue;

            declarations.Add(Decls.NewFunction(name, overloads));
        }
    }

    private static bool HasListParam(Core.Abstractions.HelperSignature sig)
    {
        foreach (var p in sig.Parameters)
        {
            if (!p.IsLambda && IsListOfObject(p.Type))
                return true;
        }
        return false;
    }

    private static bool IsListOfObject(System.Type type)
    {
        if (!type.IsGenericType) return false;
        var genDef = type.GetGenericTypeDefinition();
        return (genDef == typeof(IReadOnlyList<>) || genDef == typeof(List<>))
               && type.GetGenericArguments()[0] == typeof(object);
    }
}
