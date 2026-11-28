import { Activity } from "lucide-react";

export function BrandHeader() {
	return (
		<header className="mb-10 text-center">
			<div className="mb-5 inline-flex h-[72px] w-[72px] items-center justify-center rounded-[20px] border border-white/20 bg-white/15 backdrop-blur-[8px]">
				<Activity size={36} color="#EDE9FE" />
			</div>
			<h1 className="mb-2 text-[26px] font-bold tracking-[-0.02em] text-white">
				転倒予防支援システム
			</h1>
			<p className="text-sm text-[#EDE9FE]/70">高齢者姿勢・転倒モニタリング</p>
		</header>
	);
}
