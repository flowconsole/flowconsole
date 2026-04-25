import sdkDeclarationsSource from '../../../../src/sdk/dist/flowconsole-sdk.d.ts?raw';
import { codeSamples, defaultSampleId } from './samples';
import type { LanguageDefinition } from '../types';
import { evaluateDiagramCode } from './evaluateDiagramCode';

// Wrap the SDK dist .d.ts into an ambient module declaration so Monaco can
// resolve `import ... from "@flowconsole/sdk"` without NodeJs module resolution.
// 1) strip `export declare` → `export` (ambient context already)
// 2) convert enums into string-literal unions so users can write
//    `style: { shape: 'rectangle' }` without casting to the enum value.
// Monaco picks up ambient-module declarations reliably when placed under
// node_modules/@types/<pkg>/index.d.ts — same convention TypeScript itself uses.
const SDK_DECLARATIONS_URI = 'file:///node_modules/@types/flowconsole-sdk/index.d.ts';

function enumToStringUnion(source: string): string {
  return source.replace(/export enum (\w+) \{([^}]+)\}/g, (_, name: string, body: string) => {
    const values = Array.from(body.matchAll(/= "([^"]+)"/g)).map((m) => `'${m[1]}'`);
    return values.length ? `export type ${name} = ${values.join(' | ')};` : `export type ${name} = string;`;
  });
}

const SDK_DECLARATIONS_SOURCE =
  `declare module '@flowconsole/sdk' {\n` +
  enumToStringUnion(sdkDeclarationsSource.replace(/^\s*export declare /gm, 'export ')) +
  `\n}`;

export const typescriptLanguage: LanguageDefinition = {
  id: 'typescript',
  label: 'TypeScript',
  monacoLanguage: 'typescript',
  monacoSetup: (monaco: any) => {
    const tsCompilerOptions = {
      ...(monaco.languages.typescript.typescriptDefaults.getCompilerOptions() ?? {}),
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowSyntheticDefaultImports: true,
    };
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(tsCompilerOptions);
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions(tsCompilerOptions);

    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      SDK_DECLARATIONS_SOURCE,
      SDK_DECLARATIONS_URI
    );
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      SDK_DECLARATIONS_SOURCE,
      SDK_DECLARATIONS_URI
    );
  },
  samples: codeSamples,
  defaultSampleId,
  evaluate: (source: string) => {
    return evaluateDiagramCode(source);
  },
};
