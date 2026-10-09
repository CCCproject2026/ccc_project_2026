import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { elderApi } from "@/features/elder-management/api/elders";
import { ElderListParams, UpdateElderInput } from "@/features/elder-management/types/elder.types";

export function useElders(params: ElderListParams = {}) {
  return useQuery({
    queryKey: ["elders", params],
    queryFn: () => elderApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useElder(id: string) {
  return useQuery({
    queryKey: ["elders", id],
    queryFn: () => elderApi.get(id),
    enabled: !!id,
  });
}

export function useCreateElder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: elderApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elders"] });
    },
  });
}

export function useUpdateElder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateElderInput }) => elderApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elders"] });
    },
  });
}

export function useDeleteElder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => elderApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elders"] });
    },
  });
}