import { LogOut } from "lucide-react";
import Link from "next/link"; // 🎯 修正：Next.jsの高速リンク（Link）をインポートします

export function SidebarFooter() {
	return (
		<div className="mt-auto md:w-full">
			{/* パソコン用の表示：ユーザー情報（クリックするとプロフィールページへ移動します） */}
			{/* Linkコンポーネントを使い、href に移動したいURLを書きます */}
			<Link
				// href="/profile" マイページを作る予定なので、今いちdashboardに飛ばすようにする
				href="/dashboard"
				className="hidden md:flex items-center gap-3 px-2 py-3 border-t border-slate-800 hover:bg-slate-800/50 rounded-xl transition-colors cursor-pointer group"
			>
				<div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-medium">
					田
				</div>
				<div>
					{/* group-hover を使うと、アバターにマウスをのせたとき、名前の色が変わります */}
					<p className="text-white text-sm leading-tight group-hover:text-primary transition-colors">
						田中 花子
					</p>
					<p className="text-slate-400 text-xs">看護師（管理者）</p>
				</div>
			</Link>

			{/* パソコン用の表示：ログアウトボタン（クリックするとログイン画面へ移動します） */}
			{/* button から Link に変更して、href="/login"（または /logout ）を設定します */}
			<Link
				href="/login"
				className="hidden md:flex items-center gap-3 px-4 py-3 w-full text-sm text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
			>
				<LogOut className="w-5 h-5" />
				ログアウト
			</Link>
		</div>
	);
}
