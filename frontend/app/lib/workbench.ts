export type AdrStubStatus = "accepted" | "proposed" | "deprecated";

export type AdrStub = {
  id: string;
  title: string;
  status: AdrStubStatus;
  summary: string;
};

export const ADR_STUBS: AdrStub[] = [
  {
    id: "ADR-003",
    title: "Асинхронная обработка заказов",
    status: "accepted",
    summary: "",
  },
  {
    id: "ADR-015",
    title: "Хранилище данных",
    status: "accepted",
    summary: "",
  },
  {
    id: "ADR-021",
    title: "Gateway",
    status: "proposed",
    summary: "",
  },
];

type BuildAdrHrefInput = {
  modelId?: string;
  adrId?: string;
  nodeId?: string;
  nodeTitle?: string;
};

export function buildAdrHref({
  modelId,
  adrId,
  nodeId,
  nodeTitle,
}: BuildAdrHrefInput) {
  const params = new URLSearchParams();

  if (modelId) params.set("model", modelId);
  if (adrId) params.set("adr", adrId);
  if (nodeId) params.set("node", nodeId);
  if (nodeTitle) params.set("element", nodeTitle);

  const query = params.toString();
  return query ? `/dashboard/adr?${query}` : "/dashboard/adr";
}

export const APP_MONACO_OPTIONS = {
  automaticLayout: true,
  cursorBlinking: "smooth",
  folding: false,
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontSize: 12,
  glyphMargin: false,
  hideCursorInOverviewRuler: true,
  lineHeight: 19,
  lineNumbersMinChars: 3,
  minimap: { enabled: false },
  overviewRulerBorder: false,
  padding: { top: 16, bottom: 16 },
  renderLineHighlight: "gutter",
  roundedSelection: false,
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  tabSize: 2,
} as const;

export const APP_MONACO_WRAPPER_PROPS = {
  className: "app-monaco",
} as const;
