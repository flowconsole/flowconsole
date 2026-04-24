import type {
  Element,
  ElementSource,
  Relationship,
} from "@/lib/api/view-models";

import {
  graphGeneratedApi,
  type ElementResponse,
  type RelationshipResponse,
} from "./graph.generated";

export function toGraphElement(
  element: ElementResponse,
  modelId: string,
): Element {
  return {
    id: element.id,
    modelId,
    canonicalId: element.canonicalId,
    kind: element.kind,
    name: element.name,
    description: element.description,
    technology: element.technology,
    source: element.source as ElementSource,
    parentId: element.parentId,
    tags: element.tags,
    properties: element.properties,
  };
}

export function toGraphRelationship(
  relationship: RelationshipResponse,
  modelId: string,
): Relationship {
  return {
    id: relationship.id,
    modelId,
    kind: relationship.kind,
    sourceElementId: relationship.sourceId,
    targetElementId: relationship.targetId,
    label: relationship.label,
    technology: relationship.technology,
    source: relationship.source as ElementSource,
    properties: relationship.properties,
  };
}

export function toGraphElements(
  elements: ElementResponse[],
  modelId: string,
): Element[] {
  return elements.map((element) => toGraphElement(element, modelId));
}

export function toGraphRelationships(
  relationships: RelationshipResponse[],
  modelId: string,
): Relationship[] {
  return relationships.map((relationship) =>
    toGraphRelationship(relationship, modelId),
  );
}

export const graphApi = graphGeneratedApi.enhanceEndpoints({
  addTagTypes: ["ModelElements", "ModelRelationships", "CanonicalMappings"],
  endpoints: {
    listElements: {
      providesTags: (_result, _error, arg) => [
        { type: "ModelElements", id: arg.modelId },
      ],
    },
    getElement: {
      providesTags: (_result, _error, arg) => [
        { type: "ModelElements", id: arg.modelId },
      ],
    },
    listRelationships: {
      providesTags: (_result, _error, arg) => [
        { type: "ModelRelationships", id: arg.modelId },
      ],
    },
    getRelationship: {
      providesTags: (_result, _error, arg) => [
        { type: "ModelRelationships", id: arg.modelId },
      ],
    },
    listCanonicalMappings: {
      providesTags: (_result, _error, arg) => [
        { type: "CanonicalMappings", id: arg.modelId },
      ],
    },
    updateCanonicalMappings: {
      invalidatesTags: (_result, _error, arg) => [
        { type: "CanonicalMappings", id: arg.modelId },
      ],
    },
  },
});

export const {
  useListElementsQuery,
  useLazyListElementsQuery,
  useGetElementQuery,
  useListRelationshipsQuery,
  useLazyListRelationshipsQuery,
  useGetRelationshipQuery,
  useListCanonicalMappingsQuery,
  useUpdateCanonicalMappingsMutation,
} = graphApi;

export type {
  CanonicalMappingResponse,
  ElementResponse,
  PagedResponseOfElementResponse,
  PagedResponseOfRelationshipResponse,
  RelationshipResponse,
  UpdateCanonicalMappingsRequest,
} from "./graph.generated";
