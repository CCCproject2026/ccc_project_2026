import { BatteryBar } from "@/shared/ui/BatteryBar";
import { Cpu, Trash2, RefreshCw } from "lucide-react";
import type { DeviceRow } from "../pages/DeviceManagementPage";

interface DeviceTableProps {
  devices: DeviceRow[];
}

export function DeviceTable({ devices }: DeviceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-500">
        <thead className="text-xs text-gray-400 bg-gray-50 uppercase border-b border-gray-100">
          <tr>
            <th className="px-6 py-3 font-medium">デバイス</th>
            <th className="px-6 py-3 font-medium">バッテリー</th>
            <th className="px-6 py-3 font-medium">ステータス</th>
            <th className="px-6 py-3 font-medium">割当入所者</th>
            <th className="px-6 py-3 font-medium">最終通信</th>
            <th className="px-6 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.id} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="px-6 py-4 flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{device.deviceName}</div>
                  <div className="text-xs text-gray-400">{device.serialCode}</div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${
                    device.battery > 50 ? 'text-green-600' :
                    device.battery > 20 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {device.battery}%
                    {device.battery <= 20 && <span className="ml-2 text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">要充電</span>}
                  </span>
                </div>
                <div className="mt-1">
                  <BatteryBar level={device.battery} />
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2.5 py-1 text-xs rounded-full font-medium flex items-center w-fit gap-1.5 ${
                  device.status === 'online' ? 'bg-green-50 text-green-700' :
                  device.status === 'charging' ? 'bg-blue-50 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    device.status === 'online' ? 'bg-green-500' :
                    device.status === 'charging' ? 'bg-blue-500' :
                    'bg-gray-400'
                  }`}></span>
                  {device.status === 'online' ? 'オンライン' : 
                   device.status === 'charging' ? '充電中' : 'オフライン'}
                </span>
              </td>
              <td className="px-6 py-4">
                {device.elderName ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">
                      {device.elderName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{device.elderName}</div>
                      <div className="text-xs text-gray-400">{device.roomNumber}</div>
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400">未割当</span>
                )}
              </td>
              <td className="px-6 py-4 text-gray-400">{device.lastCommunication}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    割当解除
                  </button>
                  <button className="p-1.5 border border-gray-200 text-gray-400 rounded-lg hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
