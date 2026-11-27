"use client";

// 「対応開始」の後に、対応記録（対応内容・実際の転倒だったか）を入力するモーダル
// 保存に失敗しても入力内容は残し、もう一度保存できるようにする（Web基本設計「投稿の流れ」）
// 入力途中の内容は親（FallAlertList）にも渡し、閉じて開き直しても消えないようにする
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";
import { elderApi } from "@/features/elder-management/api/elders";
import { useDebouncedValue } from "@/features/elder-management/hooks/useDebouncedValue";
import type { UnhandledAlert } from "@/features/realtime/types";
import { FormField } from "@/shared/ui/FormField";
import { FormModal } from "@/shared/ui/FormModal";
import {
	postResponseRecord,
	ResponseRecordApiError,
} from "../api/response-records";
import {
	RESPONSE_CONTENT_MAX_LENGTH,
	responseRecordCreateSchema,
} from "../schemas/response-record-input";

/** 入力途中の内容 */
export type ResponseDraft = {
	elderId: string;
	content: string;
	// "yes" = 実際の転倒、"no" = 誤検知、"" = まだ選んでいない
	actualFall: "" | "yes" | "no";
	// 割当の高齢者に保存できなかったので、選び直す
	pickElder: boolean;
};

export function ResponseRecordModal({
	alert,
	draft,
	onDraftChange,
	onClose,
	onSaved,
}: {
	alert: UnhandledAlert;
	draft: ResponseDraft | undefined;
	onDraftChange: (alertId: string, draft: ResponseDraft) => void;
	onClose: () => void;
	onSaved: (alertId: string) => void;
}) {
	const formId = useId();
	const contentId = useId();
	const elderSearchId = useId();
	const elderSelectId = useId();

	// 割当済みならその利用者。未割当ならスタッフが選ぶ
	const [values, setValues] = useState<ResponseDraft>(
		() =>
			draft ?? {
				elderId: alert.elder?.id ?? "",
				content: "",
				actualFall: "",
				pickElder: false,
			},
	);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// 入力が変わるたびに、親にも入力途中の内容を渡す
	function update(change: Partial<ResponseDraft>) {
		const next = { ...values, ...change };
		setValues(next);
		onDraftChange(alert.alertId, next);
	}

	const showPicker = alert.elder === null || values.pickElder;

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (isSubmitting) return; // 二重送信を防ぐ
		setError(null);

		if (alert.responseStartedAt === null) {
			setError("先に「対応開始」を押してください");
			return;
		}
		const parsed = responseRecordCreateSchema.safeParse({
			elderId: values.elderId,
			content: values.content,
			isActualFall:
				values.actualFall === "yes"
					? true
					: values.actualFall === "no"
						? false
						: undefined,
			// 時刻ではなく経過時間を送る（PC の時計のずれの影響を受けない）
			elapsedMs: Math.max(0, Date.now() - alert.responseStartedAt.getTime()),
		});
		if (!parsed.success) {
			const issue = parsed.error.issues[0];
			if (issue?.path[0] === "elderId") {
				setError("対象の高齢者を選んでください");
			} else {
				setError(issue?.message ?? "入力内容を確認してください");
			}
			return;
		}

		setIsSubmitting(true);
		try {
			await postResponseRecord(parsed.data);
			onSaved(alert.alertId);
		} catch (e) {
			// 入力内容は消さずに残す
			if (e instanceof ResponseRecordApiError && e.status === 404) {
				// 割当の高齢者が退所済みなど。別の高齢者を選び直せるようにする
				update({ pickElder: true, elderId: "" });
				setError(
					"対象の高齢者が見つかりません（退所済みの可能性があります）。現場で確認した高齢者を選んでください",
				);
			} else {
				setError(e instanceof Error ? e.message : "保存できませんでした");
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<FormModal
			open
			onClose={onClose}
			title="対応記録"
			formId={formId}
			onSubmit={handleSubmit}
			submitLabel="記録を保存"
			isSubmitting={isSubmitting}
			noValidate
		>
			<p className="text-sm text-gray-600">
				機器 {alert.deviceCode}
				{alert.fallCount > 1 && `（${alert.fallCount}件の検知）`}
			</p>

			{showPicker ? (
				<ElderPicker
					searchId={elderSearchId}
					selectId={elderSelectId}
					value={values.elderId}
					onChange={(elderId) => update({ elderId })}
					unassigned={alert.elder === null}
				/>
			) : (
				<p className="text-sm">
					対象:{" "}
					<span className="font-bold">
						{alert.elder?.name}（{alert.elder?.room}）
					</span>
				</p>
			)}

			<fieldset>
				<legend className="mb-1 block text-sm font-medium text-gray-700">
					実際の転倒でしたか
					<span className="text-red-500"> *</span>
				</legend>
				<div className="flex gap-4 text-sm">
					<label className="flex items-center gap-1">
						<input
							type="radio"
							name="actualFall"
							value="yes"
							checked={values.actualFall === "yes"}
							onChange={() => update({ actualFall: "yes" })}
						/>
						はい（転倒だった）
					</label>
					<label className="flex items-center gap-1">
						<input
							type="radio"
							name="actualFall"
							value="no"
							checked={values.actualFall === "no"}
							onChange={() => update({ actualFall: "no" })}
						/>
						いいえ（誤検知）
					</label>
				</div>
			</fieldset>

			<FormField label="対応内容・メモ" htmlFor={contentId} required>
				<textarea
					id={contentId}
					value={values.content}
					onChange={(e) => update({ content: e.target.value })}
					maxLength={RESPONSE_CONTENT_MAX_LENGTH}
					rows={5}
					className="w-full rounded-lg border border-gray-300 p-2 text-sm"
					placeholder="例: 居室で座り込んでいた。外傷なし。看護師に報告済み"
				/>
				<p className="mt-1 text-right text-xs text-gray-400">
					{values.content.length} / {RESPONSE_CONTENT_MAX_LENGTH}
				</p>
			</FormField>

			{error !== null && (
				<p role="alert" className="text-sm font-semibold text-red-600">
					{error}
				</p>
			)}
		</FormModal>
	);
}

// 対象の高齢者を選ぶ（在籍中の人だけ）
function ElderPicker({
	searchId,
	selectId,
	value,
	onChange,
	unassigned,
}: {
	searchId: string;
	selectId: string;
	value: string;
	onChange: (elderId: string) => void;
	unassigned: boolean;
}) {
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebouncedValue(query.trim());
	const elders = useQuery({
		queryKey: ["response-record-elders", debouncedQuery],
		queryFn: () =>
			elderApi.list({
				status: "ACTIVE",
				q: debouncedQuery || undefined,
				limit: 100,
			}),
	});

	return (
		<div className="space-y-2">
			{unassigned && (
				<p className="text-sm font-semibold text-yellow-800">
					未割当の機器です。現場で確認した高齢者を選んでください
				</p>
			)}
			<FormField label="名前・部屋番号で検索" htmlFor={searchId}>
				<input
					id={searchId}
					type="search"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					// 検索欄で Enter を押しても、記録を保存しない
					onKeyDown={(e) => {
						if (e.key === "Enter") e.preventDefault();
					}}
					className="w-full rounded-lg border border-gray-300 p-2 text-sm"
				/>
			</FormField>
			<FormField label="対象の高齢者" htmlFor={selectId} required>
				<select
					id={selectId}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="w-full rounded-lg border border-gray-300 p-2 text-sm"
				>
					<option value="">
						{elders.isLoading ? "読み込み中…" : "選んでください"}
					</option>
					{elders.data?.data.map((elder) => (
						<option key={elder.id} value={elder.id}>
							{`${elder.lastName} ${elder.firstName}（${elder.roomNumber}）`}
						</option>
					))}
				</select>
			</FormField>
			{elders.isError && (
				<p className="text-sm text-red-600">
					高齢者の一覧を読み込めませんでした
				</p>
			)}
		</div>
	);
}
