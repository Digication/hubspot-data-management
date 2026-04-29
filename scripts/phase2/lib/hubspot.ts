/**
 * Minimal HubSpot API client.
 *
 * Uses the built-in Node fetch (Node 20+). No SDK dependency — keeps this
 * scripts bundle small and readable.
 *
 * Auth: expects HUBSPOT_ACCESS_TOKEN in the environment. Create a Private App
 * in HubSpot (Settings → Integrations → Private Apps) with read scopes on
 * crm.objects.contacts, crm.objects.companies, crm.objects.deals,
 * crm.schemas.contacts, crm.schemas.companies, crm.schemas.deals, and
 * crm.pipelines.deals. Write scopes are NOT needed for Phase 2 Part B —
 * these scripts only read.
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
