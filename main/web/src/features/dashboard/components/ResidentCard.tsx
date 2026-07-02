import { BatteryBar } from "@/shared/ui/BatteryBar";

export interface ResidentCardProps {
	//? って意味があってもなくてもいい/ 許しますって意味ですので本project では欠かせない情報になってますのでUI 側でも一応厳しくしておきましょう!!
	name: string;
	age: number;
	room: string;
	deviceName: string;
	batteryLevel: number;
	falls: number;
	falseAlarms: number;
	totalAlarms: number;
	variant: "normal" | "alarm";
}

export function ResidentCard({
	//props 定義で ? を抜けば ここの初期化がいらないです!
	name,
	age,
	room,
	deviceName,
	batteryLevel,
	falls,
	falseAlarms,
	totalAlarms,
	variant,
}: ResidentCardProps) {
	const isAlarm = variant === "alarm";
	// TailwindCSS のクラスを変数に入れると可読性が上がります!
	const cardStyle = isAlarm
		? "border-border-alarm bg-alarm-bg/40 shadow-sm"
		: "border-transparent bg-white shadow-sm hover:border-primary/50 hover:shadow-md";

	const avatarStyle = isAlarm
		? "bg-alarm-bg text-alarm"
		: "bg-primary-bg text-primary";
	return (
		//HTML semantics が明確になるように article タグを使うのが良いです!
		<article
			className={`relative rounded-xl border-2 p-4 transition-all duration-200 ease-in-out cursor-pointer group flex flex-col justify-between ${cardStyle}`}
		>
			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					<div
						aria-hidden="true"
						className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-base ${avatarStyle}`}
					>
						{name.trim().slice(0, 1)}
					</div>

					<div>
						<p className="font-semibold text-gray-900">{name}</p>

						<div className="flex gap-2 text-xs text-gray-500">
							{age && <span>{age}歳</span>}
							<span>{room}</span>
						</div>
					</div>
				</div>

				{isAlarm && (
					<span className="rounded-md bg-red-500 px-2 py-1 text-xs font-bold text-white">
						ALERT
					</span>
				)}
			</div>

			{/* Device */}
			{deviceName && (
				<div className="mt-3">
					<p className="text-xs text-gray-500">デバイス</p>
					<p className="text-sm text-gray-700">{deviceName}</p>
				</div>
			)}

			{/* Battery */}
			<div className="mt-3">
				<div className="mb-1 flex items-center justify-between">
					<span className="text-xs text-gray-500">バッテリー</span>
					<span className="text-xs font-medium text-gray-700">
						{batteryLevel}%
					</span>
				</div>

				<BatteryBar level={batteryLevel} />
			</div>

			{/* Statistics */}
			<div className="mt-4 border-t border-gray-100 pt-3">
				<div className="grid grid-cols-3 gap-2 text-center">
					<div>
						<p className="text-lg font-bold text-red-600">{falls}</p>
						<p className="text-xs text-gray-500">転倒</p>
					</div>

					<div>
						<p className="text-lg font-bold text-amber-600">{falseAlarms}</p>
						<p className="text-xs text-gray-500">誤検知</p>
					</div>

					<div>
						<p className="text-lg font-bold text-violet-600">{totalAlarms}</p>
						<p className="text-xs text-gray-500">総アラーム</p>
					</div>
				</div>
			</div>
		</article>
	);
}
