import { BatteryWarning } from "lucide-react";

interface LowBatteryWarningProps {
  count: number;
}

export function LowBatteryWarning({ count }: LowBatteryWarningProps) {
  return (
    <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-center text-red-600 gap-3">
      <BatteryWarning className="w-5 h-5 text-red-500" />
      <span className="text-sm font-medium">
        {count}台のデバイスのバッテリーが低下しています。早急に充電してください。
      </span>
    </div>
  );
}
