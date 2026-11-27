"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/features/elder-management/hooks/useDebouncedValue";
import { Modal } from "@/shared/ui/Modal";
import { useAssignableElders, useSpareDevices } from "../hooks/useDevices";
import { formatDeviceLabel, formatElderLabel } from "../lib/device-format";
import type { DeviceListItem, ElderSummary } from "../types/device.types";
import { CandidatePicker, mergeCandidatePages } from "./CandidatePicker";

// 割当・付け替えの入所者、故障交換の予備デバイスを選ぶダイアログ
// 「次へ」を押すと、呼び出し側が最新の詳細を取り直して確認ダイアログを出す（詳細設計 03 の4章）

// 検索の入力が止まってから取得し直すまでの時間（ミリ秒）
const SEARCH_DELAY_MS = 300;

// ---- 入所者を選ぶ ----

interface ElderPickerDialogProps {
	open: boolean;
	title: string; // 例: 割当先を選ぶ
	busy: boolean; // 「次へ」の処理中
	onClose: () => void;
	onNext: (elder: ElderSummary) => void;
}

export function ElderPickerDialog(props: ElderPickerDialogProps) {
	// 閉じたら中身を消す（次に開いたときに、前の検索や選択が残らないようにする）
	if (!props.open) {
		return null;
	}
	return <ElderPickerContent {...props} />;
}

function ElderPickerContent({
	title,
	busy,
	onClose,
	onNext,
}: ElderPickerDialogProps) {
	const [searchText, setSearchText] = useState("");
	const [selected, setSelected] = useState<ElderSummary | null>(null);
	const q = useDebouncedValue(searchText.trim(), SEARCH_DELAY_MS);

	const query = useAssignableElders(q, true);
	const elders = mergeCandidatePages(query.data?.pages);
	const total = query.data?.pages[query.data.pages.length - 1]?.total ?? 0;

	return (
		<Modal
			open
			onClose={onClose}
			title={title}
			maxWidthClass="max-w-[520px]"
			footer={
				<PickerFooter
					canNext={selected !== null}
					busy={busy}
					onClose={onClose}
					onNext={() => {
						if (selected !== null) {
							onNext(selected);
						}
					}}
				/>
			}
		>
			<p className="text-sm text-gray-600">
				在籍中で、まだデバイスが割り当てられていない入所者から選びます。
			</p>
			<CandidatePicker
				legend="割当先の入所者"
				searchLabel="氏名・部屋番号で検索"
				searchPlaceholder="例: 山田、301"
				searchText={searchText}
				onSearchTextChange={(text) => {
					setSearchText(text);
					// 検索を変えたら、表示されなくなる候補の選択を外す
					setSelected(null);
				}}
				candidates={elders.map((elder) => ({
					id: elder.id,
					label: formatElderLabel(elder),
				}))}
				total={total}
				selectedId={selected?.id ?? null}
				onSelect={(id) => {
					setSelected(elders.find((elder) => elder.id === id) ?? null);
				}}
				emptyMessage="割り当てられる入所者がいません。"
				isLoading={query.isPending}
				isError={query.isError}
				onRetry={() => query.refetch()}
				hasNextPage={query.hasNextPage}
				isFetchingNextPage={query.isFetchingNextPage}
				onLoadMore={() => query.fetchNextPage()}
			/>
		</Modal>
	);
}

// ---- 予備デバイスを選ぶ ----

interface SparePickerDialogProps {
	open: boolean;
	busy: boolean;
	onClose: () => void;
	onNext: (device: DeviceListItem) => void;
}

export function SparePickerDialog(props: SparePickerDialogProps) {
	if (!props.open) {
		return null;
	}
	return <SparePickerContent {...props} />;
}

function SparePickerContent({ busy, onClose, onNext }: SparePickerDialogProps) {
	const [searchText, setSearchText] = useState("");
	const [selected, setSelected] = useState<DeviceListItem | null>(null);
	const q = useDebouncedValue(searchText.trim(), SEARCH_DELAY_MS);

	const query = useSpareDevices(q, true);
	const devices = mergeCandidatePages(query.data?.pages);
	const total = query.data?.pages[query.data.pages.length - 1]?.total ?? 0;

	return (
		<Modal
			open
			onClose={onClose}
			title="交換先の予備デバイスを選ぶ"
			maxWidthClass="max-w-[520px]"
			footer={
				<PickerFooter
					canNext={selected !== null}
					busy={busy}
					onClose={onClose}
					onNext={() => {
						if (selected !== null) {
							onNext(selected);
						}
					}}
				/>
			}
		>
			<p className="text-sm text-gray-600">
				利用中で、まだ割り当てられていないデバイスから選びます。
			</p>
			<CandidatePicker
				legend="予備デバイス"
				searchLabel="デバイス名・コードで検索"
				searchPlaceholder="例: ESP32"
				searchText={searchText}
				onSearchTextChange={(text) => {
					setSearchText(text);
					setSelected(null);
				}}
				candidates={devices.map((device) => ({
					id: device.id,
					label: formatDeviceLabel(device),
				}))}
				total={total}
				selectedId={selected?.id ?? null}
				onSelect={(id) => {
					setSelected(devices.find((device) => device.id === id) ?? null);
				}}
				emptyMessage="使える予備デバイスがありません。"
				isLoading={query.isPending}
				isError={query.isError}
				onRetry={() => query.refetch()}
				hasNextPage={query.hasNextPage}
				isFetchingNextPage={query.isFetchingNextPage}
				onLoadMore={() => query.fetchNextPage()}
			/>
		</Modal>
	);
}

function PickerFooter({
	canNext,
	busy,
	onClose,
	onNext,
}: {
	canNext: boolean;
	busy: boolean;
	onClose: () => void;
	onNext: () => void;
}) {
	return (
		<>
			<button
				type="button"
				onClick={onClose}
				disabled={busy}
				className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
			>
				キャンセル
			</button>
			<button
				type="button"
				onClick={onNext}
				disabled={!canNext || busy}
				className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
			>
				{busy ? "確認中…" : "次へ"}
			</button>
		</>
	);
}
