export interface BatteryBarProps {
	level?: number;
}

export function BatteryBar({ level = 100 }: BatteryBarProps) {
	//バッテリーの残量（%）によって、中の色を変えます
	const color =
		level > 50 ? "bg-green-500" : level > 20 ? "bg-yellow-500" : "bg-red-500";

	return (
		<div className="flex items-center justify-start">
			{/* バッテリーの外枠（本体） */}
			<div className="relative w-7 h-4 border border-gray-400 rounded-[3px] p-[1px] flex items-center bg-white">
				{/* バッテリーの中身（残量に合わせて w-full や w-1/2 のように幅が変わります） */}
				<div
					className={`h-full rounded-[1px] transition-all duration-300 ease-in-out ${color}`}
					style={{ width: `${level}%` }}
				/>

				{/* バッテリーの先端にある「突起（ちいさい四角）」 */}
				{/* border-r の外側に絶対配置（absolute）でくっつけています */}
				<div className="absolute -right-[2.5px] top-[4px] w-[1.5px] h-[6px] bg-gray-400 rounded-r-[1px]" />
			</div>
		</div>
	);
}
