import { baseApi as api } from "./base-api";

const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    listElements: build.query<ListElementsApiResponse, ListElementsApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/elements`,
        params: {
          source: queryArg.source,
          kind: queryArg.kind,
          tag: queryArg.tag,
          parentId: queryArg.parentId,
          canonicalId: queryArg.canonicalId,
          q: queryArg.q,
          page: queryArg.page,
          limit: queryArg.limit,
        },
      }),
    }),
    getElement: build.query<GetElementApiResponse, GetElementApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/elements/${queryArg.elementId}`,
      }),
    }),
    listRelationships: build.query<
      ListRelationshipsApiResponse,
      ListRelationshipsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/relationships`,
        params: {
          source: queryArg.source,
          kind: queryArg.kind,
          sourceElementId: queryArg.sourceElementId,
          targetElementId: queryArg.targetElementId,
          page: queryArg.page,
          limit: queryArg.limit,
        },
      }),
    }),
    getRelationship: build.query<
      GetRelationshipApiResponse,
      GetRelationshipApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/relationships/${queryArg.relId}`,
      }),
    }),
    listCanonicalMappings: build.query<
      ListCanonicalMappingsApiResponse,
      ListCanonicalMappingsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/canonical-mappings`,
      }),
    }),
    updateCanonicalMappings: build.mutation<
      UpdateCanonicalMappingsApiResponse,
      UpdateCanonicalMappingsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/models/${queryArg.modelId}/canonical-mappings`,
        method: "PUT",
        body: queryArg.updateCanonicalMappingsRequest,
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as graphGeneratedApi };
export type ListElementsApiResponse =
  /** status 200 OK */ PagedResponseOfElementResponse;
export type ListElementsApiArg = {
  modelId: string;
  source?: string;
  kind?: string;
  tag?: string;
  parentId?: string;
  canonicalId?: string;
  q?: string;
  page?: number | string;
  limit?: number | string;
};
export type GetElementApiResponse = /** status 200 OK */ ElementResponse;
export type GetElementApiArg = {
  modelId: string;
  elementId: string;
};
export type ListRelationshipsApiResponse =
  /** status 200 OK */ PagedResponseOfRelationshipResponse;
export type ListRelationshipsApiArg = {
  modelId: string;
  source?: string;
  kind?: string;
  sourceElementId?: string;
  targetElementId?: string;
  page?: number | string;
  limit?: number | string;
};
export type GetRelationshipApiResponse =
  /** status 200 OK */ RelationshipResponse;
export type GetRelationshipApiArg = {
  modelId: string;
  relId: string;
};
export type ListCanonicalMappingsApiResponse =
  /** status 200 OK */ CanonicalMappingResponse[];
export type ListCanonicalMappingsApiArg = {
  modelId: string;
};
export type UpdateCanonicalMappingsApiResponse = unknown;
export type UpdateCanonicalMappingsApiArg = {
  modelId: string;
  updateCanonicalMappingsRequest: UpdateCanonicalMappingsRequest;
};
export type ElementResponse = {
  id: string;
  name: string;
  kind: string;
  description: null | string;
  technology: null | string;
  parentId: null | string;
  source: string;
  canonicalId: null | string;
  aliases: null | string[];
  properties: {
    [key: string]: string;
  };
  tags: string[];
};
export type PagedResponseOfElementResponse = {
  data: ElementResponse[];
  total: number | string;
  page: number | string;
  limit: number | string;
  totalPages: number | string;
  hasMore: boolean;
};
export type RelationshipResponse = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: string;
  label: null | string;
  technology: null | string;
  source: string;
  properties: {
    [key: string]: string;
  };
};
export type PagedResponseOfRelationshipResponse = {
  data: RelationshipResponse[];
  total: number | string;
  page: number | string;
  limit: number | string;
  totalPages: number | string;
  hasMore: boolean;
};
export type CanonicalMappingResponse = {
  elementId: string;
  canonicalId: string;
};
export type CanonicalMappingEntry = {
  elementId: string;
  canonicalId: null | string;
};
export type UpdateCanonicalMappingsRequest = {
  mappings: CanonicalMappingEntry[];
};
export const {
  useListElementsQuery,
  useGetElementQuery,
  useListRelationshipsQuery,
  useGetRelationshipQuery,
  useListCanonicalMappingsQuery,
  useUpdateCanonicalMappingsMutation,
} = injectedRtkApi;
