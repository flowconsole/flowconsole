import dslDeclarationsSource from './flowconsole-dsl.d.ts?raw';
import { codeSamples, defaultSampleId } from './samples';
import type { LanguageDefinition } from '../types';
import { evaluateDiagramCode } from './evaluateDiagramCode';

const DSL_DECLARATIONS_URI = 'file:///node_modules/@types/flowconsole-dsl/index.d.ts';
const DSL_DECLARATIONS_SOURCE = dslDeclarationsSource;

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
      DSL_DECLARATIONS_SOURCE,
      DSL_DECLARATIONS_URI
    );
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      DSL_DECLARATIONS_SOURCE,
      DSL_DECLARATIONS_URI
    );
  },
  samples: codeSamples,
  defaultSampleId,
  evaluate: (source: string) => {
    return evaluateDiagramCode(source);
  },
};
