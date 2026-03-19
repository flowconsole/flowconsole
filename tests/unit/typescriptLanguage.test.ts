import { describe, expect, it, vi } from 'vitest';
import { typescriptLanguage } from '../../src/web/languages/typescript/typescript';

describe('typescriptLanguage', () => {
  it('registers FlowConsole DSL typings for Monaco', () => {
    const tsAddExtraLib = vi.fn();
    const jsAddExtraLib = vi.fn();
    const tsSetCompilerOptions = vi.fn();
    const jsSetCompilerOptions = vi.fn();

    typescriptLanguage.monacoSetup?.({
      languages: {
        typescript: {
          ModuleResolutionKind: { NodeJs: 2 },
          typescriptDefaults: {
            getCompilerOptions: vi.fn().mockReturnValue({ allowJs: true }),
            setCompilerOptions: tsSetCompilerOptions,
            addExtraLib: tsAddExtraLib,
          },
          javascriptDefaults: {
            setCompilerOptions: jsSetCompilerOptions,
            addExtraLib: jsAddExtraLib,
          },
        },
      },
    } as never);

    expect(tsSetCompilerOptions).toHaveBeenCalled();
    expect(jsSetCompilerOptions).toHaveBeenCalled();
    expect(tsAddExtraLib).toHaveBeenCalledTimes(1);
    expect(jsAddExtraLib).toHaveBeenCalledTimes(1);

    const [source, uri] = tsAddExtraLib.mock.calls[0] as [string, string];
    expect(uri).toContain('flowconsole-dsl');
    expect(source).toContain('interface User');
    expect(source).toContain("declare module '@flowconsole/sdk'");
    expect(source).toContain('interface FlowBuilder');
  });
});
