namespace FlowConsole.Rules.Core.Compiled;

/// <summary>
/// Pre-compiled message template with parts ready for runtime interpolation.
/// Each part is either a literal string or a CEL expression to evaluate.
/// </summary>
public sealed record CompiledMessageTemplate(IReadOnlyList<CompiledMessagePart> Parts);

/// <summary>
/// A single part of a compiled message template.
/// </summary>
/// <param name="Content">The text content (literal text or expression source).</param>
/// <param name="IsLiteral">True if this part is literal text, false if it's an expression.</param>
/// <param name="Compiled">The compiled expression handle (null for literals or failed compilations).</param>
public sealed record CompiledMessagePart(string Content, bool IsLiteral, object? Compiled);
