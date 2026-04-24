import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyPlaceholder } from "@flowconsole/ui/components/shared/empty-placeholder";
import {
  ArchitectureDiagram,
  architectureEdgeTypes,
  architectureNodeTypes,
} from "@flowconsole/web";
import type { ElementSelection } from "@flowconsole/web";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { ApiError } from "@/lib/api/error";
import {
  graphApi,
  toApiError,
  toGraphElements,
  toGraphRelationships,
} from "@/lib/api/rtk";
import { ALL_ELEMENT_SOURCES, DETAIL_KINDS } from "@/lib/api/view-models";
import type {
  Element,
  ElementSource,
  Relationship,
} from "@/lib/api/view-models";
import { useAppDispatch } from "@/lib/store";
import { ApiErrorMessage } from "@/components/api-error-message";
import {
  ElementInspector,
  ExplorerLoader,
  ExplorerToolbar,
  mapApiTodiagramModel,
} from "@/components/explorer";

type LoadState = "loading" | "ready" | "not-found" | "error";

const ALL_SOURCES = new Set<ElementSource>(ALL_ELEMENT_SOURCES);

export function ModelExplorerPage() {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("explorer");
  const dispatch = useAppDispatch();

  // URL-driven state
  const sourcesParam = searchParams.get("sources");
  const activeSources = useMemo<Set<ElementSource>>(() => {
    if (!sourcesParam) return ALL_SOURCES;
    return new Set(
      sourcesParam
        .split(",")
        .filter((s): s is ElementSource =>
          (ALL_ELEMENT_SOURCES as string[]).includes(s),
        ),
    );
  }, [sourcesParam]);

  const [selection, setSelection] = useState<ElementSelection | null>(null);

  const [state, setState] = useState<LoadState>("loading");
  const [elements, setElements] = useState<Element[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(() => {
    if (!modelId) return;
    setState("loading");
    setError(null);
    const PAGE_LIMIT = 500;

    async function fetchAll<T>(
      fetcher: (page: number) => Promise<{ data: T[]; hasMore: boolean }>,
    ): Promise<T[]> {
      const first = await fetcher(1);
      const all = [...first.data];
      if (!first.hasMore) return all;
      // Fetch remaining pages sequentially
      let page = 2;
      let hasMore = true;
      while (hasMore) {
        const res = await fetcher(page);
        all.push(...res.data);
        hasMore = res.hasMore;
        page++;
      }
      return all;
    }

    let cancelled = false;

    Promise.all([
      fetchAll(async (page) => {
        const request = dispatch(
          graphApi.endpoints.listElements.initiate({
            modelId,
            limit: PAGE_LIMIT,
            page,
          }),
        );
        try {
          return await request.unwrap();
        } finally {
          request.unsubscribe();
        }
      }),
      fetchAll(async (page) => {
        const request = dispatch(
          graphApi.endpoints.listRelationships.initiate({
            modelId,
            limit: PAGE_LIMIT,
            page,
          }),
        );
        try {
          return await request.unwrap();
        } finally {
          request.unsubscribe();
        }
      }),
    ])
      .then(([elems, rels]) => {
        if (cancelled) return;
        setElements(toGraphElements(elems, modelId));
        setRelationships(toGraphRelationships(rels, modelId));
        setState("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const resolvedError = toApiError(err);
        if (resolvedError instanceof ApiError && resolvedError.isNotFound) {
          setState("not-found");
        } else {
          setError(resolvedError);
          setState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, modelId]);

  useEffect(() => {
    return load();
  }, [load]);

  // Apply source filter to elements
  const filteredElements = useMemo(
    () =>
      elements
        .filter((el) => activeSources.has(el.source))
        .filter((el) => !DETAIL_KINDS.has(el.kind)),
    [elements, activeSources],
  );

  // Keep only relationships where both endpoints are in filteredElements
  const filteredElementIds = useMemo(
    () => new Set(filteredElements.map((e) => e.id)),
    [filteredElements],
  );
  const filteredRelationships = useMemo(
    () =>
      relationships.filter(
        (r) =>
          filteredElementIds.has(r.sourceElementId) &&
          filteredElementIds.has(r.targetElementId),
      ),
    [relationships, filteredElementIds],
  );

  const diagramModel = useMemo(
    () => mapApiTodiagramModel(filteredElements, filteredRelationships),
    [filteredElements, filteredRelationships],
  );

  // Apply ?element= URL param as initial selection when diagram is ready
  const elementParam = searchParams.get("element");
  useEffect(() => {
    if (!elementParam || diagramModel.nodes.length === 0) return;
    const node = diagramModel.nodes.find((n) => n.id === elementParam);
    if (node) {
      setSelection({ kind: "node", item: node });
    }
  }, [elementParam, diagramModel.nodes]);

  // Reset selection when filters change
  useEffect(() => {
    setSelection(null);
  }, [activeSources]);

  // Node title map for the inspector's relationship display
  const inspectorNodeTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of diagramModel.nodes) {
      map.set(n.id, n.data.title);
    }
    return map;
  }, [diagramModel.nodes]);

  const handleSetSources = useCallback(
    (sources: ElementSource[] | null) => {
      const p = new URLSearchParams(searchParams.toString());
      if (sources === null || sources.length === ALL_ELEMENT_SOURCES.length) {
        p.delete("sources");
      } else {
        p.set("sources", sources.join(","));
      }
      navigate(`?${p.toString()}`, { replace: true });
    },
    [searchParams, navigate],
  );

  if (state === "not-found") {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Icon name="workbench" />
        <EmptyPlaceholder.Title>{t("notFoundTitle")}</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          {t("notFoundDescription")}
        </EmptyPlaceholder.Description>
      </EmptyPlaceholder>
    );
  }

  if (state === "error") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-1 pb-4">
          <h1 className="font-heading text-lg font-semibold">{t("heading")}</h1>
        </div>
        <ApiErrorMessage error={error} onRetry={load} className="flex-1" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="model-explorer">
      <div className="flex items-center gap-3 px-1 pb-4">
        <h1 className="font-heading text-lg font-semibold">{t("heading")}</h1>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
        {state === "loading" ? (
          <ExplorerLoader />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <ExplorerToolbar
              activeSources={activeSources}
              onSetSources={handleSetSources}
              elementCount={filteredElements.length}
              relationshipCount={filteredRelationships.length}
            />
            <div className="flex min-h-0 flex-1">
              <div className="relative min-h-0 flex-1">
                <ArchitectureDiagram
                  model={diagramModel}
                  nodeTypes={architectureNodeTypes}
                  edgeTypes={architectureEdgeTypes}
                  editable={true}
                  autoLayout
                  onElementSelect={setSelection}
                  focusElementId={elementParam ?? undefined}
                  notation="architecture"
                  layoutPreset="c4-like"
                  layoutEngine="elk"
                  layoutDirection="BT"
                />
              </div>
              {selection && (
                <div className="w-80 shrink-0 border-l">
                  <ElementInspector
                    selection={selection}
                    edges={diagramModel.edges}
                    nodeTitles={inspectorNodeTitles}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
