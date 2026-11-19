"use client";

import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	type DeviceListParams,
	deviceApi,
} from "@/features/device-management/api/devices";
import type { DeviceStatus } from "../types/device.types";

// TanStack Query のキー（詳細設計 03 の8章）
// すべて "devices" から始めるため、["devices"] を無効にすれば関係する表示がすべて再取得される
export const deviceKeys = {
	all: ["devices"] as const,
	list: (params: DeviceListParams) => ["devices", "list", params] as const,
	spareList: (q: string) => ["devices", "list", "spare", q] as const,
	detail: (id: string) => ["devices", "detail", id] as const,
	assignableElders: (q: string) => ["devices", "assignable-elders", q] as const,
};

// 選択肢を1回に取得する件数
const CANDIDATE_PAGE_SIZE = 20;

// ---- 読み込み ----

export function useDeviceList(params: DeviceListParams) {
	return useQuery({
		queryKey: deviceKeys.list(params),
		queryFn: () => deviceApi.list(params),
		// ページや検索を変えている間も、前の表示を残してちらつきを防ぐ
		placeholderData: (previous) => previous,
	});
}

export function useDeviceDetail(id: string) {
	return useQuery({
		queryKey: deviceKeys.detail(id),
		queryFn: () => deviceApi.get(id),
	});
}

// 割当先の入所者の選択肢。「さらに表示」で次のページを後ろに追加する
export function useAssignableElders(q: string, enabled: boolean) {
	return useInfiniteQuery({
		queryKey: deviceKeys.assignableElders(q),
		queryFn: ({ pageParam }) =>
			deviceApi.assignableElders({
				q: q || undefined,
				page: pageParam,
				limit: CANDIDATE_PAGE_SIZE,
			}),
		initialPageParam: 1,
		getNextPageParam: (last) => nextPage(last),
		enabled,
		// 選択肢は他のスタッフの操作ですぐ変わるため、開くたびに取り直す
		staleTime: 0,
	});
}

// 故障交換の予備デバイスの選択肢（ACTIVE で未割当のデバイス）
export function useSpareDevices(q: string, enabled: boolean) {
	return useInfiniteQuery({
		queryKey: deviceKeys.spareList(q),
		queryFn: ({ pageParam }) =>
			deviceApi.list({
				status: "ACTIVE",
				assigned: "false",
				q: q || undefined,
				page: pageParam,
				limit: CANDIDATE_PAGE_SIZE,
			}),
		initialPageParam: 1,
		getNextPageParam: (last) => nextPage(last),
		enabled,
		staleTime: 0,
	});
}

// まだ取得していないページがあれば、その番号を返す。なければ undefined（「さらに表示」を消す）
function nextPage(last: {
	page: number;
	limit: number;
	total: number;
}): number | undefined {
	if (last.page * last.limit < last.total) {
		return last.page + 1;
	}
	return undefined;
}

// 確認ダイアログの直前に、最新の詳細をサーバーから取り直す（詳細設計 03 の4章「操作前の確認」）
// キャッシュは使わない（staleTime: 0）。取得した値はキャッシュにも入る
export function useFetchFreshDetail() {
	const queryClient = useQueryClient();
	return (id: string) =>
		queryClient.fetchQuery({
			queryKey: deviceKeys.detail(id),
			queryFn: () => deviceApi.get(id),
			staleTime: 0,
		});
}

// ---- 更新 ----

// 更新が終わったら（成功でも失敗でも）関係する表示を取り直す
// 失敗（409 など）のときも、画面の情報が古い可能性があるため取り直す
function useRefreshAfterMutation() {
	const queryClient = useQueryClient();
	return (changesAssignment: boolean) => {
		queryClient.invalidateQueries({ queryKey: deviceKeys.all });
		if (changesAssignment) {
			// 高齢者一覧の「割当中のデバイス」と、ダッシュボードの表示も変わる
			queryClient.invalidateQueries({ queryKey: ["elders"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		}
	};
}

export function useCreateDevice() {
	const refresh = useRefreshAfterMutation();
	return useMutation({
		mutationFn: deviceApi.create,
		onSettled: () => refresh(false),
	});
}

export function useUpdateDevice() {
	const refresh = useRefreshAfterMutation();
	return useMutation({
		mutationFn: (args: {
			id: string;
			expectedUpdatedAt: string;
			deviceName?: string;
			deviceCode?: string;
		}) => {
			const { id, ...input } = args;
			return deviceApi.update(id, input);
		},
		onSettled: () => refresh(false),
	});
}

export function useChangeDeviceStatus() {
	const refresh = useRefreshAfterMutation();
	return useMutation({
		mutationFn: (args: { id: string; status: DeviceStatus }) =>
			deviceApi.changeStatus(args.id, args.status),
		onSettled: () => refresh(false),
	});
}

export function useAssignDevice() {
	const refresh = useRefreshAfterMutation();
	return useMutation({
		mutationFn: (args: { id: string; elderId: string }) =>
			deviceApi.assign(args.id, args.elderId),
		onSettled: () => refresh(true),
	});
}

export function useTransferDevice() {
	const refresh = useRefreshAfterMutation();
	return useMutation({
		mutationFn: (args: {
			id: string;
			elderId: string;
			expectedAssignmentId: string;
		}) => deviceApi.transfer(args.id, args.elderId, args.expectedAssignmentId),
		onSettled: () => refresh(true),
	});
}

export function useUnassignDevice() {
	const refresh = useRefreshAfterMutation();
	return useMutation({
		mutationFn: (args: { id: string; assignmentId: string }) =>
			deviceApi.unassign(args.id, args.assignmentId),
		onSettled: () => refresh(true),
	});
}

export function useReplaceDevice() {
	const refresh = useRefreshAfterMutation();
	return useMutation({
		mutationFn: (args: {
			id: string;
			newDeviceId: string;
			expectedAssignmentId: string;
		}) =>
			deviceApi.replace(args.id, args.newDeviceId, args.expectedAssignmentId),
		onSettled: () => refresh(true),
	});
}
