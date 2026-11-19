"use client";

import { ArrowLeft, Cpu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { type Notice, NoticeBanner } from "@/shared/ui/NoticeBanner";
import { DeviceActions } from "../components/DeviceActions";
import { DeviceEditModal } from "../components/DeviceEditModal";
import { useDeviceDetail } from "../hooks/useDevices";
import { deviceErrorMessage } from "../lib/device-error-message";
import {
	formatDateTime,
	formatDeviceStatus,
	formatElderLabel,
} from "../lib/device-format";
import type { DeviceDetail } from "../types/device.types";

// デバイス詳細（/devices/[id]）。詳細設計 03 の8章
// 基本情報、現在の割当、割当履歴を表示し、編集・状態変更・割当・解除・付け替え・故障交換を行う

export function DeviceDetailPage({ id }: { id: string }) {
	const { data: device, isPending, error, refetch } = useDeviceDetail(id);
	const [notice, setNotice] = useState<Notice | null>(null);
	const [editing, setEditing] = useState(false);

	return (
		<div className="flex flex-col gap-6 pb-6 max-w-[1200px] mx-auto w-full">
			<Link
				href="/devices"
				className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-fit"
			>
				<ArrowLeft className="w-4 h-4" />
				デバイス一覧に戻る
			</Link>

			<NoticeBanner notice={notice} onClose={() => setNotice(null)} />

			{isPending && <p className="text-sm text-gray-500">読み込み中…</p>}

			{error !== null && device === undefined && (
				<div
					role="alert"
					className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
				>
					<span>{deviceErrorMessage(error)}</span>
					<button
						type="button"
						onClick={() => refetch()}
						className="px-3 py-1 rounded-lg border border-red-300 bg-white text-xs font-medium hover:bg-red-100"
					>
						再試行
					</button>
				</div>
			)}

			{device !== undefined && (
				<>
					<DeviceHeader device={device}>
						<DeviceActions
							device={device}
							onNotice={setNotice}
							onEdit={() => setEditing(true)}
						/>
					</DeviceHeader>
					<CurrentAssignmentCard device={device} />
					<HistoryCard device={device} />
					<DeviceEditModal
						device={editing ? device : null}
						onClose={() => setEditing(false)}
						onSaved={(message) => {
							setEditing(false);
							setNotice({ type: "success", message });
						}}
					/>
				</>
			)}
		</div>
	);
}

function DeviceHeader({
	device,
	children,
}: {
	device: DeviceDetail;
	children: React.ReactNode;
}) {
	const active = device.status === "ACTIVE";
	return (
		<section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
			<div className="flex items-start gap-4">
				<div
					className={`p-3 rounded-xl ${active ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"}`}
				>
					<Cpu className="w-6 h-6" />
				</div>
				<div className="min-w-0 flex-1">
					<h1 className="text-xl font-bold text-gray-900 break-all">
						{device.deviceName}
					</h1>
					<p className="text-sm text-gray-500 font-mono">{device.deviceCode}</p>
				</div>
				<span
					className={`px-2.5 py-1 text-xs rounded-full font-medium shrink-0 ${
						active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
					}`}
				>
					{formatDeviceStatus(device.status)}
				</span>
			</div>

			<dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
				<div>
					<dt className="text-gray-500">接続状態</dt>
					<dd className="text-gray-400">未取得</dd>
				</div>
				<div>
					<dt className="text-gray-500">登録日時</dt>
					<dd className="text-gray-900">{formatDateTime(device.createdAt)}</dd>
				</div>
				<div>
					<dt className="text-gray-500">最終更新</dt>
					<dd className="text-gray-900">{formatDateTime(device.updatedAt)}</dd>
				</div>
			</dl>

			{children}
		</section>
	);
}

function CurrentAssignmentCard({ device }: { device: DeviceDetail }) {
	const current = device.currentAssignment;
	return (
		<section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
			<h2 className="text-lg font-bold text-gray-900 mb-3">現在の割当</h2>
			{current === null ? (
				<p className="text-sm text-gray-500">割り当てられていません。</p>
			) : (
				<dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
					<div>
						<dt className="text-gray-500">入所者</dt>
						<dd className="font-medium text-gray-900">
							{formatElderLabel(current.elder)}
						</dd>
					</div>
					<div>
						<dt className="text-gray-500">割当開始</dt>
						<dd className="text-gray-900">
							{formatDateTime(current.assignedAt)}
						</dd>
					</div>
				</dl>
			)}
		</section>
	);
}

function HistoryCard({ device }: { device: DeviceDetail }) {
	return (
		<section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
			<h2 className="text-lg font-bold text-gray-900 mb-1">割当履歴</h2>
			<p className="text-xs text-gray-500 mb-3">
				新しい順に最大50件を表示します。
			</p>
			{device.history.length === 0 ? (
				<p className="text-sm text-gray-500">履歴はありません。</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
							<tr>
								<th scope="col" className="px-4 py-2 font-medium">
									入所者
								</th>
								<th scope="col" className="px-4 py-2 font-medium">
									開始
								</th>
								<th scope="col" className="px-4 py-2 font-medium">
									終了
								</th>
							</tr>
						</thead>
						<tbody>
							{device.history.map((item) => (
								<tr key={item.id} className="border-b border-gray-50">
									<td className="px-4 py-2 text-gray-900">
										{formatElderLabel(item.elder)}
									</td>
									<td className="px-4 py-2 text-gray-600">
										{formatDateTime(item.assignedAt)}
									</td>
									<td className="px-4 py-2 text-gray-600">
										{item.unassignedAt === null ? (
											<span className="text-green-700 font-medium">割当中</span>
										) : (
											formatDateTime(item.unassignedAt)
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}
