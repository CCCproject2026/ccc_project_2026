import { Cpu, WifiOff, BatteryWarning, Link } from "lucide-react";
import { StatCard } from "@/shared/ui/StatCard";
import { LowBatteryWarning } from "../components/LowBatteryWarning";
import { DeviceTable } from "../components/DeviceTable";
import { DeviceRegisterModal } from "../components/DeviceRegisterModal";

export type DeviceRow = {
  id: string;
  deviceName: string;
  serialCode: string;
  battery: number;
  status: "online" | "offline" | "charging";
  elderName: string | null;
  roomNumber: string | null;
  lastCommunication: string;
};

// Mock data based on the screenshot
const mockDevices: DeviceRow[] = [
  { id: "1", deviceName: "ESP32-101", serialCode: "dev-001", battery: 87, status: "online", elderName: "山田 太郎", roomNumber: "101号室", lastCommunication: "06/10 09:10" },
  { id: "2", deviceName: "ESP32-102", serialCode: "dev-002", battery: 18, status: "online", elderName: "中村 きみ", roomNumber: "102号室", lastCommunication: "06/10 09:14" },
  { id: "3", deviceName: "ESP32-203", serialCode: "dev-003", battery: 65, status: "online", elderName: "伊藤 茂", roomNumber: "203号室", lastCommunication: "06/10 09:12" },
  { id: "4", deviceName: "ESP32-205", serialCode: "dev-004", battery: 92, status: "online", elderName: "渡辺 富士子", roomNumber: "205号室", lastCommunication: "06/10 09:15" },
  { id: "5", deviceName: "ESP32-302", serialCode: "dev-005", battery: 44, status: "online", elderName: "加藤 ハル", roomNumber: "302号室", lastCommunication: "06/10 09:08" }
];

export function DeviceManagementPage() {
  const totalDevices = mockDevices.length;
  const assignedDevices = mockDevices.filter(d => d.elderName).length;
  const unassignedDevices = totalDevices - assignedDevices;
  const lowBatteryDevices = mockDevices.filter(d => d.battery <= 20).length;

  return (
    <div className="p-8 w-full bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">デバイス管理</h1>
          <p className="text-gray-500 text-sm">IoTデバイス（ESP32）のバッテリー状態と入所者への割当を管理します</p>
        </div>
        <DeviceRegisterModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="総デバイス数" value={totalDevices} icon={Cpu} color="blue" description="総デバイス数" />
        <StatCard title="割当済み" value={assignedDevices} icon={Link} color="green" description="割当済み" />
        <StatCard title="未割当" value={unassignedDevices} icon={WifiOff} color="slate" description="未割当" />
        <StatCard title="低バッテリー" value={lowBatteryDevices} icon={BatteryWarning} color="red" description="低バッテリー" />
      </div>

      {lowBatteryDevices > 0 && (
        <LowBatteryWarning count={lowBatteryDevices} />
      )}

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold mb-4">デバイス一覧</h2>
        <DeviceTable devices={mockDevices} />
      </div>
    </div>
  );
}
