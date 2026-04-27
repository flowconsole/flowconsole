import { describe, expect, it, vi } from 'vitest';
import { typescriptLanguage } from '../../languages/typescript/typescript';

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
    // ambient @flowconsole/sdk module types
    expect(tsAddExtraLib).toHaveBeenCalledTimes(1);
    expect(jsAddExtraLib).toHaveBeenCalledTimes(1);

    const [sdkSource, sdkUri] = tsAddExtraLib.mock.calls[0] as [string, string];
    expect(sdkUri).toContain('flowconsole-sdk');
    expect(sdkSource).toContain("declare module '@flowconsole/sdk'");
    expect(sdkSource).toContain('class User');
    expect(sdkSource).toContain('class RestApi');
    // enums are converted to string-literal unions for ergonomic editor usage
    expect(sdkSource).toContain("export type ShapeKind = 'rectangle'");
  });
});
