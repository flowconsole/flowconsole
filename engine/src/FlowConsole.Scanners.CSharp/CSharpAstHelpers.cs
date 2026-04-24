using FlowConsole.Scanners.CodeParsing.TreeSitterSupport;
using TreeSitter;

namespace FlowConsole.Scanners.CSharp;

internal sealed record CSharpInvocationInfo(
    string MethodName,
    IReadOnlyList<string> NameChain,
    Node FunctionNode,
    IReadOnlyList<Node> Arguments);

internal sealed record CSharpAssignmentInfo(
    string TargetName,
    string? ReceiverName,
    Node ValueNode);

internal sealed record CSharpObjectCreationInfo(
    string? TypeName,
    IReadOnlyList<Node> Arguments,
    IReadOnlyList<CSharpAssignmentInfo> InitializerAssignments);

internal static class CSharpAstHelpers
{
    private static readonly string[] LocalScopeTypes =
    [
        "block",
        "method_declaration",
        "constructor_declaration",
        "local_function_statement",
        "accessor_declaration",
        "lambda_expression",
    ];

    public static bool TryGetInvocation(Node node, out CSharpInvocationInfo info)
    {
        info = null!;

        if (!string.Equals(node.Type, "invocation_expression", StringComparison.Ordinal))
            return false;

        var functionNode = node.TryGetChildForField("function");
        if (functionNode is null)
            return false;

        var nameChain = GetNameChain(functionNode);
        if (nameChain.Count == 0)
            return false;

        var argumentsNode = node.TryGetChildForField("arguments");
        var arguments = argumentsNode is null
            ? []
            : GetArgumentExpressions(argumentsNode);

        info = new CSharpInvocationInfo(
            MethodName: nameChain[^1],
            NameChain: nameChain,
            FunctionNode: functionNode,
            Arguments: arguments);

        return true;
    }

    public static bool TryGetObjectCreation(Node node, out CSharpObjectCreationInfo info)
    {
        info = null!;

        if (node.Type is not ("object_creation_expression" or "implicit_object_creation_expression"))
            return false;

        var typeNode = node.TryGetChildForField("type");
        var argumentListNode = node.Children
            .FirstOrDefault(child => string.Equals(child.Type, "argument_list", StringComparison.Ordinal));
        var initializerNode = node.TryGetChildForField("initializer") ??
                              node.Children.FirstOrDefault(child =>
                                  string.Equals(child.Type, "initializer_expression", StringComparison.Ordinal));

        info = new CSharpObjectCreationInfo(
            TypeName: typeNode is null ? null : TryGetSimpleName(typeNode),
            Arguments: argumentListNode is null ? [] : GetArgumentExpressions(argumentListNode),
            InitializerAssignments: initializerNode is null ? [] : CollectAssignments(initializerNode));

        return true;
    }

    public static IReadOnlyList<CSharpAssignmentInfo> CollectAssignments(Node container)
    {
        var assignments = new List<CSharpAssignmentInfo>();

        foreach (var assignment in container.DescendantsOfType("assignment_expression"))
        {
            var leftNode = assignment.TryGetChildForField("left");
            var rightNode = assignment.TryGetChildForField("right");
            if (leftNode is null || rightNode is null)
                continue;

            var targetName = TryGetSimpleName(leftNode);
            if (string.IsNullOrWhiteSpace(targetName))
                continue;

            assignments.Add(new CSharpAssignmentInfo(
                TargetName: targetName,
                ReceiverName: TryGetReceiverName(leftNode),
                ValueNode: rightNode));
        }

        return assignments;
    }

    public static IReadOnlyList<string> GetNameChain(Node node)
    {
        return node.Type switch
        {
            "identifier" => [node.Text],
            "predefined_type" => [node.Text],
            "generic_name" => GetGenericNameChain(node),
            "qualified_name" or "member_access_expression" or "alias_qualified_name" => GetCompositeNameChain(node),
            "element_access_expression" => GetElementAccessBaseChain(node),
            "invocation_expression" when TryGetInvocation(node, out var invocation) => invocation.NameChain,
            _ => [],
        };
    }

    public static string? TryGetSimpleName(Node node)
    {
        var chain = GetNameChain(node);
        return chain.Count == 0 ? null : chain[^1];
    }

    public static string? TryResolveValueToken(Node expression, Node fileRoot)
    {
        return TryResolveValueTokenCore(expression, fileRoot, allowIdentifierFallback: true);
    }

    public static bool? TryResolveBooleanConstant(Node expression, Node fileRoot)
    {
        var unwrapped = UnwrapExpression(expression);
        if (unwrapped is null)
            return null;

        return unwrapped.Type switch
        {
            "true_literal" => true,
            "false_literal" => false,
            "boolean_literal" when string.Equals(unwrapped.Text, "true", StringComparison.Ordinal) => true,
            "boolean_literal" when string.Equals(unwrapped.Text, "false", StringComparison.Ordinal) => false,
            "identifier" => TryResolveBooleanIdentifier(unwrapped.Text, unwrapped, fileRoot),
            _ => null,
        };
    }

    public static string? TryGetBaseIdentifier(Node expression)
    {
        var unwrapped = UnwrapExpression(expression);
        if (unwrapped is null)
            return null;

        return unwrapped.Type switch
        {
            "identifier" => unwrapped.Text,
            "invocation_expression" when TryGetInvocation(unwrapped, out var invocation) =>
                TryGetBaseIdentifier(invocation.FunctionNode),
            "member_access_expression" or "qualified_name" or "alias_qualified_name" =>
                unwrapped.NamedChildren.Count > 0 ? TryGetBaseIdentifier(unwrapped.NamedChildren.First()) : null,
            "element_access_expression" =>
                unwrapped.NamedChildren.Count > 0 ? TryGetBaseIdentifier(unwrapped.NamedChildren.First()) : null,
            _ => null,
        };
    }

    public static bool IsWrapperHttpInvocation(CSharpInvocationInfo invocation)
    {
        if (invocation.MethodName is not ("GetAsync" or "PostAsync" or "PutAsync" or "DeleteAsync"))
            return false;

        var receiver = TryGetReceiverName(invocation.FunctionNode);
        return !string.IsNullOrWhiteSpace(receiver) &&
               receiver.Contains("RequestProvider", StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsPublishOrSendInvocation(CSharpInvocationInfo invocation)
    {
        if (invocation.MethodName is not ("Publish" or "PublishAsync" or "Send" or "SendAsync"))
            return false;

        var receiver = TryGetReceiverName(invocation.FunctionNode);
        return !string.IsNullOrWhiteSpace(receiver) &&
               (receiver.Contains("mediat", StringComparison.OrdinalIgnoreCase) ||
                receiver.Contains("bus", StringComparison.OrdinalIgnoreCase) ||
                receiver.Contains("publish", StringComparison.OrdinalIgnoreCase) ||
                receiver.Contains("send", StringComparison.OrdinalIgnoreCase));
    }

    private static IReadOnlyList<Node> GetArgumentExpressions(Node argumentListNode)
    {
        var arguments = new List<Node>();

        foreach (var argument in argumentListNode.NamedChildren
                     .Where(child => string.Equals(child.Type, "argument", StringComparison.Ordinal)))
        {
            var named = argument.NamedChildren.ToList();
            if (named.Count > 0)
                arguments.Add(named[0]);
        }

        return arguments;
    }

    private static IReadOnlyList<string> GetGenericNameChain(Node node)
    {
        var identifierNode = node.FirstNamedChildOfType("identifier");
        return identifierNode is null ? [] : [identifierNode.Text];
    }

    private static IReadOnlyList<string> GetCompositeNameChain(Node node)
    {
        var namedChildren = node.NamedChildren.ToList();
        if (namedChildren.Count == 0)
            return [];

        if (namedChildren.Count == 1)
            return GetNameChain(namedChildren[0]);

        var leftChain = GetNameChain(namedChildren[0]).ToList();
        var rightName = TryGetSimpleName(namedChildren[^1]);
        if (!string.IsNullOrWhiteSpace(rightName))
            leftChain.Add(rightName);

        return leftChain;
    }

    private static IReadOnlyList<string> GetElementAccessBaseChain(Node node)
    {
        var baseExpression = node.NamedChildren.FirstOrDefault();
        return baseExpression is null ? [] : GetNameChain(baseExpression);
    }

    private static string? TryGetReceiverName(Node functionNode)
    {
        var chain = GetNameChain(functionNode);
        return chain.Count < 2 ? null : chain[^2];
    }

    private static Node? UnwrapExpression(Node expression)
    {
        if (string.Equals(expression.Type, "argument", StringComparison.Ordinal))
        {
            var namedChildren = expression.NamedChildren.ToList();
            return namedChildren.Count == 0 ? null : namedChildren[0];
        }

        if (string.Equals(expression.Type, "parenthesized_expression", StringComparison.Ordinal))
        {
            var namedChildren = expression.NamedChildren.ToList();
            return namedChildren.Count == 0 ? null : UnwrapExpression(namedChildren[0]);
        }

        return expression;
    }

    private static string? TryResolveValueTokenCore(Node expression, Node fileRoot, bool allowIdentifierFallback)
    {
        var unwrapped = UnwrapExpression(expression);
        if (unwrapped is null)
            return null;

        return unwrapped.Type switch
        {
            "string_literal" => unwrapped.TryGetStringLiteralContent(),
            "identifier" => TryResolveIdentifierToken(unwrapped.Text, unwrapped, fileRoot, allowIdentifierFallback),
            "member_access_expression" => TryResolveMemberAccessToken(unwrapped),
            "element_access_expression" => TryResolveElementAccessToken(unwrapped),
            "invocation_expression" => TryResolveInvocationValue(unwrapped, fileRoot, allowIdentifierFallback),
            "object_creation_expression" or "implicit_object_creation_expression" =>
                TryResolveObjectCreationValue(unwrapped, fileRoot, allowIdentifierFallback),
            "interpolated_string_expression" => null,
            "conditional_expression" => null,
            _ => null,
        };
    }

    private static string? TryResolveMemberAccessToken(Node node)
    {
        var chain = GetNameChain(node);
        return chain.Count == 0 ? null : chain[^1];
    }

    private static string? TryResolveElementAccessToken(Node node)
    {
        var baseChain = GetElementAccessBaseChain(node);
        if (baseChain.Count == 0 || !string.Equals(baseChain[^1], "Configuration", StringComparison.OrdinalIgnoreCase))
            return null;

        foreach (var stringLiteral in node.DescendantsOfType("string_literal"))
        {
            var content = stringLiteral.TryGetStringLiteralContent();
            if (!string.IsNullOrWhiteSpace(content))
                return content;
        }

        return null;
    }

    private static string? TryResolveInvocationValue(
        Node invocationNode,
        Node fileRoot,
        bool allowIdentifierFallback)
    {
        if (!TryGetInvocation(invocationNode, out var invocation))
            return null;

        if (invocation.MethodName is "GetRequiredValue" or "GetValue")
            return invocation.Arguments.Count == 0 ? null : TryResolveValueTokenCore(invocation.Arguments[0], fileRoot, allowIdentifierFallback);

        if (invocation.MethodName == "ToString")
        {
            var receiverNode = invocation.FunctionNode.NamedChildren.FirstOrDefault();
            return receiverNode is null ? null : TryResolveValueTokenCore(receiverNode, fileRoot, allowIdentifierFallback);
        }

        if (invocation.MethodName is "CombineUri" or "ForAddress")
            return invocation.Arguments.Count == 0 ? null : TryResolveValueTokenCore(invocation.Arguments[0], fileRoot, allowIdentifierFallback);

        return null;
    }

    private static string? TryResolveObjectCreationValue(
        Node node,
        Node fileRoot,
        bool allowIdentifierFallback)
    {
        if (!TryGetObjectCreation(node, out var creation) || creation.Arguments.Count == 0)
            return null;

        return TryResolveValueTokenCore(creation.Arguments[0], fileRoot, allowIdentifierFallback);
    }

    private static string? TryResolveIdentifierToken(
        string identifier,
        Node usageNode,
        Node fileRoot,
        bool allowIdentifierFallback)
    {
        foreach (var scope in EnumerateResolutionScopes(usageNode, fileRoot))
        {
            var resolved = TryResolveFromScope(identifier, usageNode, scope, fileRoot);
            if (!string.IsNullOrWhiteSpace(resolved))
                return resolved;
        }

        return allowIdentifierFallback ? identifier : null;
    }

    private static bool? TryResolveBooleanIdentifier(string identifier, Node usageNode, Node fileRoot)
    {
        foreach (var scope in EnumerateResolutionScopes(usageNode, fileRoot))
        {
            var resolved = TryResolveBooleanFromScope(identifier, usageNode, scope);
            if (resolved.HasValue)
                return resolved;
        }

        return null;
    }

    private static IEnumerable<Node> EnumerateResolutionScopes(Node usageNode, Node fileRoot)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);

        var localScope = FindAncestor(usageNode, LocalScopeTypes);
        if (localScope is not null && seen.Add($"{localScope.Type}:{localScope.StartIndex}:{localScope.EndIndex}"))
            yield return localScope;

        var classScope = FindAncestor(usageNode, "class_declaration");
        if (classScope is not null && seen.Add($"{classScope.Type}:{classScope.StartIndex}:{classScope.EndIndex}"))
            yield return classScope;

        yield return fileRoot;
    }

    private static Node? FindAncestor(Node node, params string[] targetTypes)
    {
        var current = node.Parent;
        while (current is not null)
        {
            if (targetTypes.Contains(current.Type, StringComparer.Ordinal))
                return current;

            current = current.Parent;
        }

        return null;
    }

    private static string? TryResolveFromScope(
        string identifier,
        Node usageNode,
        Node scope,
        Node fileRoot)
    {
        var beforeUsageOnly = !string.Equals(scope.Type, "class_declaration", StringComparison.Ordinal);
        var usageStartIndex = usageNode.StartIndex;
        var candidates = new List<(int SortKey, Node ValueNode)>();

        foreach (var variableDeclarator in scope.DescendantsOfType("variable_declarator"))
        {
            var nameNode = variableDeclarator.TryGetChildForField("name") ??
                           variableDeclarator.FirstNamedChildOfType("identifier");
            if (nameNode is null || !string.Equals(nameNode.Text, identifier, StringComparison.Ordinal))
                continue;

            if (beforeUsageOnly && variableDeclarator.StartIndex >= usageStartIndex)
                continue;

            var valueNode = variableDeclarator.TryGetChildForField("value");
            if (valueNode is null)
            {
                var namedChildren = variableDeclarator.NamedChildren.ToList();
                valueNode = namedChildren.Count > 1 ? namedChildren[1] : null;
            }

            if (valueNode is not null)
                candidates.Add((variableDeclarator.StartIndex, valueNode));
        }

        foreach (var assignment in scope.DescendantsOfType("assignment_expression"))
        {
            var leftNode = assignment.TryGetChildForField("left");
            var rightNode = assignment.TryGetChildForField("right");
            if (leftNode is null || rightNode is null)
                continue;

            if (!string.Equals(TryGetSimpleName(leftNode), identifier, StringComparison.Ordinal))
                continue;

            if (beforeUsageOnly && assignment.StartIndex >= usageStartIndex)
                continue;

            candidates.Add((assignment.StartIndex, rightNode));
        }

        foreach (var candidate in candidates.OrderByDescending(entry => entry.SortKey))
        {
            var resolved = TryResolveValueTokenCore(candidate.ValueNode, fileRoot, allowIdentifierFallback: false);
            if (!string.IsNullOrWhiteSpace(resolved))
                return resolved;
        }

        return null;
    }

    private static bool? TryResolveBooleanFromScope(
        string identifier,
        Node usageNode,
        Node scope)
    {
        var beforeUsageOnly = !string.Equals(scope.Type, "class_declaration", StringComparison.Ordinal);
        var usageStartIndex = usageNode.StartIndex;
        var candidates = new List<(int SortKey, Node ValueNode)>();

        foreach (var variableDeclarator in scope.DescendantsOfType("variable_declarator"))
        {
            var nameNode = variableDeclarator.TryGetChildForField("name") ??
                           variableDeclarator.FirstNamedChildOfType("identifier");
            if (nameNode is null || !string.Equals(nameNode.Text, identifier, StringComparison.Ordinal))
                continue;

            if (beforeUsageOnly && variableDeclarator.StartIndex >= usageStartIndex)
                continue;

            var valueNode = variableDeclarator.TryGetChildForField("value");
            if (valueNode is null)
            {
                var namedChildren = variableDeclarator.NamedChildren.ToList();
                valueNode = namedChildren.Count > 1 ? namedChildren[1] : null;
            }

            if (valueNode is not null)
                candidates.Add((variableDeclarator.StartIndex, valueNode));
        }

        foreach (var assignment in scope.DescendantsOfType("assignment_expression"))
        {
            var leftNode = assignment.TryGetChildForField("left");
            var rightNode = assignment.TryGetChildForField("right");
            if (leftNode is null || rightNode is null)
                continue;

            if (!string.Equals(TryGetSimpleName(leftNode), identifier, StringComparison.Ordinal))
                continue;

            if (beforeUsageOnly && assignment.StartIndex >= usageStartIndex)
                continue;

            candidates.Add((assignment.StartIndex, rightNode));
        }

        foreach (var candidate in candidates.OrderByDescending(entry => entry.SortKey))
        {
            var value = UnwrapExpression(candidate.ValueNode);
            if (value is null)
                continue;

            if (string.Equals(value.Type, "true_literal", StringComparison.Ordinal))
                return true;
            if (string.Equals(value.Type, "false_literal", StringComparison.Ordinal))
                return false;
            if (string.Equals(value.Type, "boolean_literal", StringComparison.Ordinal))
            {
                if (string.Equals(value.Text, "true", StringComparison.Ordinal))
                    return true;
                if (string.Equals(value.Text, "false", StringComparison.Ordinal))
                    return false;
            }
        }

        return null;
    }
}
