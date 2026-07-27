// src/features/dashboard/components/ResponseHistoryTable.tsx

import { AlertCircle } from "lucide-react";

interface HistoryItem {
    id: string;
    createdAt: string;
    respondedAt: string;
    duration: string;
    judgment: string;
    staff: string;
    memo: string;
}

interface ResponseHistoryTableProps {
    history: HistoryItem[];
}

export function ResponseHistoryTable({ history }: ResponseHistoryTableProps) {
    // 1. 「現在進行中の対応中データ」と「過去の完了履歴」を分離
    const activeAlarms = history.filter((item) => item.respondedAt === "対応中...");
    const pastHistories = history.filter((item) => item.respondedAt !== "対応中...");

    return (
        <div className="space-y-6">
            {/* 💡 【視認性改善】現在進行中のアラートがある場合、最上部に目立つ形で別枠表示 */}
            {activeAlarms.length > 0 && (
                <div className="space-y-3" aria-label="現在発生中のアラート">
                    {activeAlarms.map((alarm) => (
                        <div
                            key={alarm.id}
                            className="flex flex-col gap-3 p-4 bg-alarm-bg border border-alarm/30 rounded-xl text-alarm animate-pulse"
                        >
                            <div className="flex items-center gap-2 font-bold text-base">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>【緊急対応中】{alarm.judgment}アラートが発生しています</span>
                            </div>
                            
                            
                        </div>
                    ))}
                </div>
            )}

            {/*  過去の完了履歴一覧 */}
            {pastHistories.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">過去の対応履歴はありません。</p>
            ) : (
                <>
                    {/* ① 【モバイル対応】スマホ・タブレット幅では横スクロールさせず、縦並びカードリストに切り替え */}
                    <div className="block md:hidden space-y-4" aria-label="過去の対応履歴（モバイル表示）">
                        {pastHistories.map((item) => (
                            <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                    <span className="text-xs text-gray-500 font-mono block">{item.createdAt}</span>
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                                        item.judgment === "転倒" ? "bg-alarm-bg text-alarm" : "bg-warning-bg text-warning"
                                    }`}>
                                        {item.judgment}
                                    </span>
                                </div>
                                {/* モバイルでもホバーに頼らずメモの全文が読める */}
                                <p className="text-sm text-gray-700 leading-relaxed bg-white p-2.5 rounded border border-gray-100">
                                    {item.memo}
                                </p>
                                <div className="flex justify-between text-xs text-gray-500 pt-1">
                                    <span>対応時間: <strong className="text-gray-700 font-semibold">{item.duration}</strong></span>
                                    <span>担当: {item.staff}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ② 【PC・大画面用】セマンティックかつアクセシブルなデスクトップ用テーブル仕様 */}
                    <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200">
                        <table className="w-full text-left border-collapse bg-white text-sm">
                            {/* アクセシリティのためのキャプション指定 */}
                            <caption className="sr-only">過去の転倒および誤検知の対応実績履歴一覧</caption>
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                                    <th scope="col" className="p-4 w-[160px]">発生日時</th>
                                    <th scope="col" className="p-4 w-[100px]">判定結果</th>
                                    <th scope="col" className="p-4 w-[100px]">対応時間</th>
                                    <th scope="col" className="p-4 w-[120px]">対応スタッフ</th>
                                    <th scope="col" className="p-4">対応メモ・状況詳細</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                {pastHistories.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <th scope="row" className="p-4 font-mono font-normal text-gray-500 whitespace-nowrap">
                                            {item.createdAt}
                                        </th>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-md ${
                                                item.judgment === "転倒" 
                                                    ? "bg-alarm-bg text-alarm" 
                                                    : "bg-warning-bg text-warning"
                                            }`}>
                                                {item.judgment}
                                            </span>
                                        </td>
                                        <td className="p-4 whitespace-nowrap font-medium text-gray-900">{item.duration}</td>
                                        <td className="p-4 whitespace-nowrap">{item.staff}</td>
                                        {/* PCでは十分な幅があるため省略(truncate)せず自然にテキストを折り返し表示 */}
                                        <td className="p-4 text-gray-600 leading-relaxed min-w-[250px]">
                                            {item.memo}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}