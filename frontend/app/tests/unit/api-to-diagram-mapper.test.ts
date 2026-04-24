// @vitest-environment node
import { describe, it, expect } from "vitest";
import { mapApiTodiagramModel } from "@/components/explorer/api-to-diagram-mapper";
import type { Element, Relationship } from "@/lib/api/view-models";

const makeElement = (overrides: Partial<Element> = {}): Element => ({
  id: "el-1",
  modelId: "m-1",
  canonicalId: null,
  kind: "Service",
  name: "OrderService",
  description: null,
  technology: null,
  source: "Git",
  parentId: null,
  tags: [],
  properties: {},
  ...overrides,
});

const makeRelationship = (overrides: Partial<Relationship> = {}): Relationship => ({
  id: "rel-1",
  modelId: "m-1",
  kind: "Calls",
  sourceElementId: "el-1",
  targetElementId: "el-2",
  label: null,
  technology: null,
  source: "Git",
  properties: {},
  ...overrides,
});

describe("mapApiTodiagramModel", () => {
  it("returns empty model for empty input", () => {
    const model = mapApiTodiagramModel([], []);
    expect(model.nodes).toHaveLength(0);
    expect(model.edges).toHaveLength(0);
    expect(model.flows).toBeUndefined();
  });

  it("maps elements to nodes with correct id and title", () => {
    const el = makeElement({ id: "svc-1", name: "API Gateway", kind: "Gateway" });
    const model = mapApiTodiagramModel([el], []);
    expect(model.nodes).toHaveLength(1);
    const node = model.nodes[0];
    expect(node.id).toBe("svc-1");
    expect(node.data.title).toBe("API Gateway");
    expect(node.data.subtitle).toBe("Gateway");
  });

  it("sets position to (0,0) for auto-layout", () => {
    const el = makeElement();
    const model = mapApiTodiagramModel([el], []);
    expect(model.nodes[0].position).toEqual({ x: 0, y: 0 });
  });

  it("maps parentId correctly", () => {
    const child = makeElement({ id: "child-1", parentId: "parent-1" });
    const model = mapApiTodiagramModel([child], []);
    expect(model.nodes[0].parentId).toBe("parent-1");
  });

  it("sets parentId undefined when null", () => {
    const el = makeElement({ parentId: null });
    const model = mapApiTodiagramModel([el], []);
    expect(model.nodes[0].parentId).toBeUndefined();
  });

  it("maps element tags to node data", () => {
    const el = makeElement({ tags: ["frontend", "api"] });
    const model = mapApiTodiagramModel([el], []);
    expect(model.nodes[0].data.tags).toEqual(["frontend", "api"]);
  });

  it("maps relationships to edges with correct endpoints", () => {
    const el1 = makeElement({ id: "el-1" });
    const el2 = makeElement({ id: "el-2" });
    const rel = makeRelationship({ id: "rel-1", sourceElementId: "el-1", targetElementId: "el-2" });
    const model = mapApiTodiagramModel([el1, el2], [rel]);
    expect(model.edges).toHaveLength(1);
    const edge = model.edges[0];
    expect(edge.id).toBe("rel-1");
    expect(edge.source).toBe("el-1");
    expect(edge.target).toBe("el-2");
  });

  it("keeps relationship kind as edge label", () => {
    const rel = makeRelationship({ kind: "DependsOn" });
    const model = mapApiTodiagramModel([], [rel]);
    expect((model.edges[0].data as Record<string, unknown>)?.label).toBe("DependsOn");
  });

  it("handles multiple elements and relationships", () => {
    const elements = Array.from({ length: 5 }, (_, i) =>
      makeElement({ id: `el-${i}`, name: `Service ${i}` }),
    );
    const rels = [
      makeRelationship({ id: "r1", sourceElementId: "el-0", targetElementId: "el-1" }),
      makeRelationship({ id: "r2", sourceElementId: "el-1", targetElementId: "el-2" }),
    ];
    const model = mapApiTodiagramModel(elements, rels);
    expect(model.nodes).toHaveLength(5);
    expect(model.edges).toHaveLength(2);
  });

  it("assigns tone based on source", () => {
    const el = makeElement({ source: "CodeScan" });
    const model = mapApiTodiagramModel([el], []);
    expect(model.nodes[0].data.tone).toBe("success");
  });
});
