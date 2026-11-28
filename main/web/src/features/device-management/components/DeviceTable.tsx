import { ChevronRight, Cpu } from "lucide-react";
import Link from "next/link";
import { formatDeviceStatus } from "../lib/device-format";
import type { DeviceListItem } from "../types/device.types";

// デバイス一覧の表（詳細設計 03 の8章）
// 列: デバイス名とコード、利用状態、接続状態、割当先、操作
// 接続状態はデータの取得元（AI Server・MQTT）がまだないため、「未取得」と表示する
// （オンラインと誤解させる値は出さない）

interface DeviceTableProps {
	devices: DeviceListItem[];
	loading: boolean;
}

export function DeviceTable({ devices, loading }: DeviceTableProps) {
	if (loading) {
		return (
			<p className="px-6 py-10 text-center text-sm text-gray-500">
				読み込み中…
			</p>
		);
	}
	if (devices.length === 0) {
		return (
			<p className="px-6 py-10 text-center text-sm text-gray-500">
				条件に合うデバイスはありません。
			</p>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm text-gray-500">
				<thead className="text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
					<tr>
						<th scope="col" className="px-6 py-3 font-medium">
							デバイス
						</th>
						<th scope="col" className="px-6 py-3 font-medium">
							利用状態
						</th>
						<th scope="col" className="px-6 py-3 font-medium">
							接続状態
						</th>
						<th scope="col" className="px-6 py-3 font-medium">
							割当先
						</th>
						<th scope="col" className="px-6 py-3 font-medium text-right">
							操作
						</th>
					</tr>
				</thead>
				<tbody>
					{devices.map((device) => (
						<DeviceRow key={device.id} device={device} />
					))}
				</tbody>
			</table>
		</div>
	);
}

function DeviceRow({ device }: { device: DeviceListItem }) {
	const elder = device.currentAssignment?.elder ?? null;
	const active = device.status === "ACTIVE";

	return (
		<tr className="border-b border-gray-50 hover:bg-gray-50/50">
			<td className="px-6 py-4">
				<div className="flex items-center gap-3">
					<div
						className={`p-2 rounded-lg ${active ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"}`}
					>
						<Cpu className="w-4 h-4" />
					</div>
					<div className="min-w-0">
						<div className="font-semibold text-gray-900 break-all">
							{device.deviceName}
						</div>
						<div className="text-xs text-gray-500 font-mono">
							{device.deviceCode}
						</div>
					</div>
				</div>
			</td>
			<td className="px-6 py-4">
				<span
					className={`px-2.5 py-1 text-xs rounded-full font-medium inline-flex items-center gap-1.5 ${
						active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
					}`}
				>
					<span
						className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-500" : "bg-gray-400"}`}
					/>
					{formatDeviceStatus(device.status)}
				</span>
			</td>
			<td className="px-6 py-4 text-gray-400">未取得</td>
			<td className="px-6 py-4">
				{elder === null ? (
					<span className="text-gray-400">未割当</span>
				) : (
					<div>
						<div className="font-medium text-gray-900">
							{elder.lastName} {elder.firstName}
						</div>
						<div className="text-xs text-gray-500">部屋 {elder.roomNumber}</div>
					</div>
				)}
			</td>
			<td className="px-6 py-4 text-right">
				<Link
					href={`/devices/${encodeURIComponent(device.id)}`}
					aria-label={`${device.deviceName}（${device.deviceCode}）の詳細`}
					className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50"
				>
					詳細・操作
					<ChevronRight className="w-3.5 h-3.5" />
				</Link>
			</td>
		</tr>
	);
}
