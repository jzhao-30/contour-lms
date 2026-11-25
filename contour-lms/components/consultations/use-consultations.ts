"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, type ListParams } from "@/lib/api/client";
import type { UpdateConsultationInput } from "@/lib/validation/consultation";

/** Shared key prefix, so one invalidate refreshes every list. */
const KEY = "consultations";

/** "mine" is the student dashboard, "all" the admin view. */
export function useConsultations(scope: "mine" | "all", params: ListParams) {
  return useQuery({
    queryKey: [KEY, scope, params],
    queryFn: () => (scope === "mine" ? api.listMine(params) : api.listAll(params)),
    // keep the previous page visible while the next one loads
    placeholderData: keepPreviousData,
  });
}

export function useCreateConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.create,
    // refetch the lists so the new booking shows up
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Reschedule, complete and cancel all use the same PATCH. */
export function useUpdateConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateConsultationInput }) =>
      api.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}
