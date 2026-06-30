// Alarm banner placeholder.
// uses shared/ui/Badge, shared/tokens/colors, shared/tokens/spacing
"use client";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

interface AlarmBannerProps {
  count?: number;
  residentName?: string;
  room?: string;
  time?: string;
  onRespond?: () => void;
}

export function AlarmBanner(alarmBannerProps: AlarmBannerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <section
      className="rounded-2xl border border-red-200 bg-red-50 p-6"
      role="status"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>

          <div>
            <div className="text-lg font-semibold text-red-600">
              未対応のアラームがあります（{alarmBannerProps.count}件）
            </div>

            <p className="mt-1 text-sm text-gray-600">
              {alarmBannerProps.residentName}（{alarmBannerProps.room}）
              検知時刻: {alarmBannerProps.time}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full rounded-xl bg-red-500 px-5 py-3 font-medium text-white transition hover:bg-red-600 md:w-auto"
        >
          対応する
        </button>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            {/* Modal Box */}
            <div className="relative w-[95%] max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
              {/* Close button */}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>

              {/* Icon */}
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
              </div>

              {/* Title */}
              <h2 className="mt-4 text-center text-xl font-bold text-red-600">
                転倒・姿勢崩れを検知
              </h2>

              <p className="mt-2 text-center text-sm text-gray-500">
                AIモデルが異常な体勢変化を検知しました
              </p>

              {/* Info Card */}
              <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold">
                      {alarmBannerProps.residentName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {alarmBannerProps.room}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-400">経過時間</p>
                    <p className="text-xl font-bold text-red-500">
                      {alarmBannerProps.time}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  検知日時：{alarmBannerProps.time}
                </p>
              </div>

              {/* Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled={!alarmBannerProps.onRespond}
                  onClick={() => {
                    alarmBannerProps.onRespond?.();
                    setIsModalOpen(false);
                  }}
                  className="flex-1 rounded-xl bg-red-500 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  現場確認・対応する
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-gray-600 hover:bg-gray-50"
                >
                  後で
                </button>
              </div>

              {/* Footer note */}
              <p className="mt-4 text-center text-xs text-gray-400">
                緊急時は直ちに担当医師へ連絡してください
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
