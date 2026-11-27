"use client";

import { Cpu, Link, PowerOff, Search, Unlink } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
	clampPage,
	getTotalPages,
} from "@/features/elder-management/lib/pagination";
import { type Notice, NoticeBanner } from "@/shared/ui/NoticeBanner";
import { StatCard } from "@/shared/ui/StatCard";
import type { DeviceListParams } from "../api/devices";
import { DeviceRegisterModal } from "../components/DeviceRegisterModal";
import { DeviceTable } from "../components/DeviceTable";
import { useDeviceList } from "../hooks/useDevices";
import { deviceErrorMessage } from "../lib/device-error-message";
import type { DeviceStatus } from "../types/device.types";

// デバイス一覧（/devices）。詳細設計 03 の8章
// 集計（総数・割当済み・未割当・停止中）、検索、状態と割当の有無での絞り込み、一覧

const PAGE_SIZE = 20;

type StatusFilter = DeviceStatus | "ALL";
type AssignedFilter = "true" | "false" | "ALL";

const SELECT_CLASS =
	"h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500";

export function DeviceManagementPage() {
	const [page, setPage] = useState(1);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
	const [assignedFilter, setAssignedFilter] = useState<AssignedFilter>("ALL");
	const [searchInput, setSearchInput] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [registerOpen, setRegisterOpen] = useState(false);
	const [notice, setNotice] = useState<Notice | null>(null);

	const params: DeviceListParams = { page, limit: PAGE_SIZE };
	if (statusFilter !== "ALL") {
		params.status = statusFilter;
	}
	if (assignedFilter !== "ALL") {
		params.assigned = assignedFilter;
	}
	if (searchQuery !== "") {
		params.q = searchQuery;
	}

	const { data, isPending, error } = useDeviceList(params);
	const devices = data?.data ?? [];
	const total = data?.total ?? 0;
	const summary = data?.summary ?? {
		total: 0,
		assigned: 0,
		unassigned: 0,
		inactive: 0,
	};
	const totalPages = getTotalPages(total, PAGE_SIZE);

	// 件数が減ったときに、空のページを表示しないように現在ページを補正する
	if (data !== undefined) {
		const correctedPage = clampPage(page, total, PAGE_SIZE);
		if (correctedPage !== page) {
			setPage(correctedPage);
		}
	}

	const handleSearch = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		// サーバーの上限（50文字）に合わせて切る
		setSearchQuery(searchInput.trim().slice(0, 50));
		setPage(1);
	};

	const handleClear = () => {
		setSearchInput("");
		setSearchQuery("");
		setPage(1);
	};

	return (
		<div className="flex flex-col gap-6 pb-6 max-w-[1600px] mx-auto w-full">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">
						デバイス管理
					</h1>
					<p className="text-gray-500 text-sm">
						IoTデバイス（ESP32）の登録と、入所者への割当を管理します
					</p>
				</div>
				<button
					type="button"
					onClick={() => setRegisterOpen(true)}
					className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors self-start sm:self-auto"
				>
					<Cpu className="w-4 h-4" />
					デバイス登録
				</button>
			</div>

			<NoticeBanner notice={notice} onClose={() => setNotice(null)} />

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<StatCard
					title="総デバイス数"
					value={summary.total}
					icon={Cpu}
					color="blue"
					description="停止中を含むすべてのデバイス"
				/>
				<StatCard
					title="割当済み"
					value={summary.assigned}
					icon={Link}
					color="green"
					description="入所者に割り当て中"
				/>
				<StatCard
					title="未割当"
					value={summary.unassigned}
					icon={Unlink}
					color="violet"
					description="利用中で、割り当てられていない予備"
				/>
				<StatCard
					title="停止中"
					value={summary.inactive}
					icon={PowerOff}
					color="slate"
					description="故障・修理中・回収など"
				/>
			</div>

			<div className="bg-white rounded-xl shadow-sm border border-gray-100">
				<form
					onSubmit={handleSearch}
					className="flex flex-wrap items-end gap-3 p-4 border-b border-gray-100"
				>
					<div className="flex-1 basis-56 min-w-[12rem]">
						<label
							htmlFor="device-search"
							className="block text-xs font-medium text-gray-500 mb-1"
						>
							デバイス名・コードで検索
						</label>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
							<input
								id="device-search"
								type="search"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								placeholder="例: ESP32-001"
								maxLength={50}
								className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
							/>
						</div>
					</div>
					<div>
						<label
							htmlFor="device-status-filter"
							className="block text-xs font-medium text-gray-500 mb-1"
						>
							利用状態
						</label>
						<select
							id="device-status-filter"
							value={statusFilter}
							onChange={(e) => {
								setStatusFilter(e.target.value as StatusFilter);
								setPage(1);
							}}
							className={SELECT_CLASS}
						>
							<option value="ALL">すべて</option>
							<option value="ACTIVE">利用中</option>
							<option value="INACTIVE">停止中</option>
						</select>
					</div>
					<div>
						<label
							htmlFor="device-assigned-filter"
							className="block text-xs font-medium text-gray-500 mb-1"
						>
							割当
						</label>
						<select
							id="device-assigned-filter"
							value={assignedFilter}
							onChange={(e) => {
								setAssignedFilter(e.target.value as AssignedFilter);
								setPage(1);
							}}
							className={SELECT_CLASS}
						>
							<option value="ALL">すべて</option>
							<option value="true">割当済み</option>
							<option value="false">未割当</option>
						</select>
					</div>
					<button
						type="submit"
						className="h-10 px-4 shrink-0 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors"
					>
						検索
					</button>
					{(searchInput !== "" || searchQuery !== "") && (
						<button
							type="button"
							onClick={handleClear}
							className="h-10 px-4 shrink-0 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
						>
							クリア
						</button>
					)}
				</form>

				{error !== null && (
					<p
						role="alert"
						className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
					>
						一覧を取得できませんでした。{deviceErrorMessage(error)}
					</p>
				)}

				<DeviceTable devices={devices} loading={isPending} />
			</div>

			{total > PAGE_SIZE && (
				<div className="flex items-center justify-between px-2">
					<p className="text-sm text-gray-500">
						{total} 件中 {(page - 1) * PAGE_SIZE + 1} 〜{" "}
						{Math.min(page * PAGE_SIZE, total)} 件を表示
					</p>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
						>
							前へ
						</button>
						<button
							type="button"
							onClick={() => setPage((p) => p + 1)}
							disabled={page >= totalPages}
							className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
						>
							次へ
						</button>
					</div>
				</div>
			)}

			<DeviceRegisterModal
				open={registerOpen}
				onClose={() => setRegisterOpen(false)}
				onRegistered={(message) => {
					setRegisterOpen(false);
					setNotice({ type: "success", message });
				}}
			/>
		</div>
	);
}
