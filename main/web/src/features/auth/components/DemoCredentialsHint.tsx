export function DemoCredentialsHint() {
	return (
		<div className="mt-6 rounded-[10px] border border-[#DDD6FE] bg-[#F5F3FF] p-[14px]">
			<p className="mb-1.5 text-xs font-semibold text-[#5B21B6]">
				デモ用アカウント
			</p>
			<div className="space-y-0.5 text-xs leading-[1.8] text-[#6B7280]">
				<div>
					<span className="font-medium text-[#7C3AED]">管理者（看護師）:</span>{" "}
					admin@care.jp / admin123
				</div>
				<div>
					<span className="font-medium text-[#7C3AED]">介護士:</span>{" "}
					nurse@care.jp / nurse123
				</div>
			</div>
		</div>
	);
}
