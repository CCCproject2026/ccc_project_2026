import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	elderApi,
	isElderConflictError,
} from "@/features/elder-management/api/elders";
import {
	ElderListParams,
	UpdateElderInput,
} from "@/features/elder-management/types/elder.types";

export function useElders(params: ElderListParams = {}) {
	return useQuery({
		queryKey: ["elders", params],
		queryFn: () => elderApi.list(params),
		placeholderData: (prev) => prev,
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
		mutationFn: ({ id, data }: { id: string; data: UpdateElderInput }) =>
			elderApi.update(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["elders"] });
		},
	});
}

export function useDeleteElder() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			expectedAssignmentId,
		}: {
			id: string;
			expectedAssignmentId: string | null;
		}) => elderApi.delete(id, expectedAssignmentId),
		onSuccess: () => {
			// 退所では割当も終了するため、デバイス管理とダッシュボードも取り直す
			// （デバイス側の操作 useDevices.ts と同じ範囲）
			queryClient.invalidateQueries({ queryKey: ["elders"] });
			queryClient.invalidateQueries({ queryKey: ["devices"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		},
		onError: (error) => {
			// 409 は割当が変わっていたということなので、画面の情報も古い。取り直す
			if (isElderConflictError(error)) {
				queryClient.invalidateQueries({ queryKey: ["elders"] });
				queryClient.invalidateQueries({ queryKey: ["devices"] });
				queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			}
		},
	});
}
