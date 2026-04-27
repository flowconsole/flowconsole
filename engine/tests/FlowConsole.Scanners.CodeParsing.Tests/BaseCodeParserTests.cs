using FlowConsole.Core.Entities;
using FlowConsole.Scanners.CodeParsing;

namespace FlowConsole.Scanners.CodeParsing.Tests;

/// <summary>
/// Verifies that BaseCodeParser is accessible from the extracted library
/// and implements both ICodeParser interfaces.
/// </summary>
public sealed class BaseCodeParserAccessibilityTests
{
    [Fact]
    public void BaseCodeParser_ImplementsScannersICodeParser()
    {
        Assert.True(typeof(FlowConsole.Scanners.Core.ICodeParser).IsAssignableFrom(typeof(BaseCodeParser)));
    }

    [Fact]
    public void BaseCodeParser_ImplementsCoreICodeParser()
    {
        Assert.True(typeof(FlowConsole.Core.Interfaces.ICodeParser).IsAssignableFrom(typeof(BaseCodeParser)));
    }
}
