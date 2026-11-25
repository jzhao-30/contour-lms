import { PAGINATION } from "@/lib/constants";
import { API } from "@/lib/routes";
import type { Consultation, Paged } from "@/lib/types";
import type {
  ConsultationFilter,
  CreateConsultationInput,
  UpdateConsultationInput,
} from "@/lib/validation/consultation";

/** Browser wrapper for our API. Data changes go through fetch("/api/..."), not Server Actions. */

/** Carries the server's { error: { code, message, details } } payload. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "unknown",
      err?.message ?? "Request failed",
      err?.details?.fields,
    );
  }
  return body as T;
}

export type ListParams = {
  filter: ConsultationFilter;
  page: number;
  page_size?: number;
};

const qs = (p: ListParams) =>
  new URLSearchParams({
    filter: p.filter,
    page: String(p.page),
    page_size: String(p.page_size ?? PAGINATION.defaultPageSize),
  }).toString();

export const api = {
  /** Student: own consultations. */
  listMine: (p: ListParams) =>
    request<Paged<Consultation>>(`${API.consultations}?${qs(p)}`),

  /** Admin: every consultation. */
  listAll: (p: ListParams) =>
    request<Paged<Consultation>>(`${API.adminConsultations}?${qs(p)}`),

  create: (input: CreateConsultationInput) =>
    request<{ data: Consultation }>(API.consultations, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateConsultationInput) =>
    request<{ data: Consultation }>(API.consultation(id), {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};
