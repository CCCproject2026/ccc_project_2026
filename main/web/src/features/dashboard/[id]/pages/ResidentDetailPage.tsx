import { ChevronLeft, FileText, User } from "lucide-react";
import Link from "next/link";

// 1. 新しいテーブルコンポーネントをインポート
import { ResponseHistoryTable } from "@/features/dashboard/components/ResponseHistoryTable";
import { DeviceStatusPanel } from "../components/DeviceStatusPanel";
//  ヘルパー関数 getResidentDetailById をインポート
import { getResidentDetailById } from "../../constants/mockDashboardData";

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ResidentDetailPage({ id }: { id: string }) {
    // mockDashboardData の関数を使って、履歴も整形済みの詳細データを一括取得
    const residentDetail = getResidentDetailById(id);

    // 入所者データが見つからない場合のガード（早期リターン）
    if (!residentDetail) {
        return (
            <div className="p-6 text-center">
                <div className="mb-4">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        ダッシュボードに戻る
                    </Link>
                </div>
                <p className="text-gray-500 font-medium">指定された入所者が見つかりませんでした。</p>
            </div>
        );
    }

    return (
        <>
            {/* Back link */}
            <div className="mb-4">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    ダッシュボードに戻る
                </Link>
            </div>

            {/* Top row: resident info (left) + device status (right) */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                {/* 入所者情報 */}
                <article className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-h3 font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        入所者情報
                    </h2>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-full bg-primary-bg flex items-center justify-center text-primary-dark font-bold text-lg shrink-0">
                            {residentDetail.name.charAt(0)}
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-900">{residentDetail.name}</p>
                            <p className="text-sm text-gray-400">{residentDetail.age}歳</p>
                        </div>
                    </div>
                    <div className="text-sm space-y-3 border-t border-gray-100 pt-4 mb-5">
                        <div className="flex justify-between">
                            <span className="text-gray-500">居室番号</span>
                            <span className="text-gray-800 font-medium">
                                {residentDetail.room}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">生年月日</span>
                            <span className="text-gray-800 font-medium">
                                {residentDetail.birthday}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">年齢</span>
                            <span className="text-gray-800 font-medium">
                                {residentDetail.age}歳
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-2xl font-bold text-alarm">
                                {residentDetail.stats.fallCount}
                            </span>
                            <span className="text-xs text-gray-500">転倒</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-2xl font-bold text-warning">
                                {residentDetail.stats.falseAlarmCount}
                            </span>
                            <span className="text-xs text-gray-500">誤検知</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-2xl font-bold text-primary">
                                {residentDetail.stats.totalCount}
                            </span>
                            <span className="text-xs text-gray-500">合計</span>
                        </div>
                    </div>
                </article>

                {/* デバイス状態 */}
                <DeviceStatusPanel
                    deviceName={residentDetail.device.name}
                    deviceId={residentDetail.device.id}
                    batteryLevel={residentDetail.device.battery}
                    lastSeen={residentDetail.device.lastCommunication}
                   /* 
                      【修正箇所】
                      アラームの有無ではなく、モックデータ内の接続状態フラグ（isOnline等）を参照するか、
                      現状のデータ構造に合わせて、デバイスが「オンライン」状態であることを正しく判定して渡します。
                      ※もし mockDashboardData 側にフラグがない場合は、residentDetail.device.status === "online" 
                        などの適切な生存状態を判定する条件式に置き換えてください。
                    */
                    status={residentDetail.device.isOnline ? "active" : "inactive"}
                />
            </div>

            {/* Bottom: full-width response history log */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-h3 font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    対応履歴ログ
                    <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-primary-bg text-primary">
                        {residentDetail.history.length}件
                    </span>
                </h3>
                
                {/* 
                   自動生成された整形済みの履歴配列 (history) をそのままコンポーネントに渡します。
                     すでに "転倒" や "誤検知" の判定文字列が正しくマッピングされています。
                */}
                <ResponseHistoryTable history={residentDetail.history} />
            </section>
        </>
    );
}