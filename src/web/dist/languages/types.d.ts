// @flowconsole/web/languages/types — stub declarations

export type CodeSample = {
  id: string;
  title: string;
  description: string;
  code: string;
};

export type EvaluationResult =
  | { ok: true; model: { nodes: unknown[]; edges: unknown[] } }
  | { ok: false; error: string };

export type EvaluationContext = {
  apiBaseUrl: string;
};

export type SupportedLanguage = 'typescript' | 'python' | 'csharp' | 'java' | 'go';

export type LanguageDefinition = {
  id: string;
  label: string;
  monacoLanguage: string;
  monacoSetup?: (monaco: unknown) => void;
  samples: CodeSample[];
  defaultSampleId?: string;
  evaluate: (source: string, context: EvaluationContext) => Promise<EvaluationResult>;
};
