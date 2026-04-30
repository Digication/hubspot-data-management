/**
 * Minimal HubSpot API client.
 *
 * Uses the built-in Node fetch (Node 20+). No SDK dependency — keeps this
 * scripts bundle small and readable.
 *
 * Auth: expects HUBSPOT_ACCESS_TOKEN in the environment. Generate a Service
 * Key in HubSpot (Settings → Integrations → Service Keys); see .env.example
 * for the required scopes.
 */

const BASE = "https://api.hubapi.com";

function token(): string {
  const t = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!t) {
    throw new Error(
      "HUBSPOT_ACCESS_TOKEN is not set. Add it to .env (copy from .env.example).",
    );
  }
  return t;
}

export interface HubSpotError extends Error {
  status: number;
  body: string;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(
      `HubSpot API ${res.status} ${res.statusText} on ${path}\n${body}`,
    ) as HubSpotError;
    err.status = res.status;
    err.body = body;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// -----------------------------------------------------------------------------
// Property schema
// -----------------------------------------------------------------------------

export interface HubSpotProperty {
  name: string;
  label: string;
  description?: string;
  type: string;
  fieldType: string;
  groupName?: string;
  options?: Array<{ label: string; value: string }>;
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
  hubspotDefined?: boolean;
  modificationMetadata?: {
    archivable: boolean;
    readOnlyDefinition: boolean;
    readOnlyValue: boolean;
  };
  [k: string]: unknown;
}

export async function listProperties(
  objectType: string,
): Promise<HubSpotProperty[]> {
  const out = await request<{ results: HubSpotProperty[] }>(
    `/crm/v3/properties/${objectType}?archived=false`,
  );
  return out.results;
}

export async function getProperty(
  objectType: string,
  name: string,
): Promise<HubSpotProperty | null> {
  try {
    return await request<HubSpotProperty>(
      `/crm/v3/properties/${objectType}/${encodeURIComponent(name)}?archived=false`,
    );
  } catch (err) {
    if ((err as HubSpotError).status === 404) return null;
    throw err;
  }
}

/**
 * Archives a property. HubSpot's "delete" is actually a soft archive —
 * the property disappears from the UI but is recoverable from the
 * Archived tab in Settings → Properties for ~90 days.
 */
export async function archiveProperty(
  objectType: string,
  name: string,
): Promise<void> {
  await request<void>(
    `/crm/v3/properties/${objectType}/${encodeURIComponent(name)}`,
    { method: "DELETE" },
  );
}

/**
 * Returns the count of records where the given property has any value
 * (HAS_PROPERTY filter). Used as a pre-deletion safety check.
 */
export async function countWithProperty(
  objectType: string,
  propertyName: string,
): Promise<number> {
  const res = await search(objectType, {
    filterGroups: [{ filters: [{ propertyName, operator: "HAS_PROPERTY" }] }],
    limit: 1,
  });
  return res.total;
}

// -----------------------------------------------------------------------------
// Search (paginated)
// -----------------------------------------------------------------------------

export interface SearchRequest {
  filterGroups?: Array<{
    filters: Array<{
      propertyName: string;
      operator: string;
      value?: string;
      values?: string[];
      highValue?: string;
    }>;
  }>;
  properties?: string[];
  sorts?: Array<{ propertyName: string; direction: "ASCENDING" | "DESCENDING" }>;
  limit?: number;
  after?: string;
}

export interface SearchResult {
  total: number;
  results: Array<{
    id: string;
    properties: Record<string, string | null>;
    createdAt: string;
    updatedAt: string;
  }>;
  paging?: { next?: { after: string } };
}

export async function search(
  objectType: string,
  req: SearchRequest,
): Promise<SearchResult> {
  return request<SearchResult>(`/crm/v3/objects/${objectType}/search`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Search and yield every page. Handles HubSpot's 10,000-record search cap by
 * requiring callers to narrow the filter if they exceed it.
 */
export async function* searchAll(
  objectType: string,
  req: SearchRequest,
): AsyncGenerator<SearchResult["results"][number]> {
  let after: string | undefined = req.after;
  let pageCount = 0;
  const limit = req.limit ?? 100;

  while (true) {
    const page: SearchResult = await search(objectType, { ...req, after, limit });

    // HubSpot search has a hard 10,000-record ceiling. Warn loudly.
    if (pageCount === 0 && page.total > 10000) {
      throw new Error(
        `Search returned ${page.total} records; HubSpot search caps at 10,000. ` +
          `Narrow the filter or use object-list + client-side filtering instead.`,
      );
    }

    for (const r of page.results) yield r;

    if (!page.paging?.next?.after) return;
    after = page.paging.next.after;
    pageCount++;
  }
}

// -----------------------------------------------------------------------------
// Pipelines
// -----------------------------------------------------------------------------

export interface HubSpotPipeline {
  id: string;
  label: string;
  displayOrder: number;
  stages: Array<{
    id: string;
    label: string;
    displayOrder: number;
    metadata?: Record<string, string>;
  }>;
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
}

export async function listPipelines(
  objectType: string,
): Promise<HubSpotPipeline[]> {
  const out = await request<{ results: HubSpotPipeline[] }>(
    `/crm/v3/pipelines/${objectType}`,
  );
  return out.results;
}

export async function deletePipeline(
  objectType: string,
  pipelineId: string,
): Promise<void> {
  await request<void>(`/crm/v3/pipelines/${objectType}/${pipelineId}`, {
    method: "DELETE",
  });
}

/**
 * Removes a stage from a pipeline. HubSpot rejects this if the stage
 * still has deals associated with it.
 */
export async function deletePipelineStage(
  objectType: string,
  pipelineId: string,
  stageId: string,
): Promise<void> {
  await request<void>(
    `/crm/v3/pipelines/${objectType}/${pipelineId}/stages/${stageId}`,
    { method: "DELETE" },
  );
}

// -----------------------------------------------------------------------------
// Object updates
// -----------------------------------------------------------------------------

export async function updateObject(
  objectType: string,
  id: string,
  properties: Record<string, string>,
): Promise<{ id: string; properties: Record<string, string | null> }> {
  return request<{ id: string; properties: Record<string, string | null> }>(
    `/crm/v3/objects/${objectType}/${id}`,
    { method: "PATCH", body: JSON.stringify({ properties }) },
  );
}

/**
 * Batch-archive (soft-delete) up to 100 records per call. Records are
 * recoverable from HubSpot's Recently Deleted view for ~90 days.
 *
 * HubSpot's batch endpoint returns 204 with no body on success.
 */
export async function batchArchiveObjects(
  objectType: string,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  if (ids.length > 100) {
    throw new Error(
      `batchArchiveObjects: max 100 IDs per call, got ${ids.length}`,
    );
  }
  await request<void>(`/crm/v3/objects/${objectType}/batch/archive`, {
    method: "POST",
    body: JSON.stringify({ inputs: ids.map((id) => ({ id })) }),
  });
}
