"use client";

import { useUser } from "@clerk/nextjs";
import Image from "next/image";

// サイドバーに出す丸いプロフィール写真
// ProfileAvatar（マイページ）と同じく、写真は DB ではなく Clerk の user.imageUrl を使う
// size: "md" はデスクトップ左下、"sm" はモバイル下部タブの「マイページ」
export function SidebarAvatar({
	initial,
	name,
	size,
}: {
	initial: string; // 写真がないときに出す1文字
	name: string; // 画像の代わりの説明（alt）に使う
	size: "md" | "sm";
}) {
	const { isLoaded, user } = useUser();

	// 大きさごとのクラスとピクセル数
	let sizeClass = "w-9 h-9";
	let textClass = "text-sm font-medium";
	let pixels = 36;
	if (size === "sm") {
		sizeClass = "w-5 h-5";
		textClass = "text-[10px] font-bold";
		pixels = 20;
	}

	// Clerk は写真がなくても自動の画像を返すので、hasImage で「本人が登録したか」を見る
	if (isLoaded && user?.hasImage) {
		return (
			<Image
				src={user.imageUrl}
				alt={`${name}のプロフィール写真`}
				width={pixels}
				height={pixels}
				className={`${sizeClass} shrink-0 rounded-full object-cover`}
			/>
		);
	}

	// 写真がない（または Clerk の読み込み中）ときは今までどおり violet の丸にイニシャルを出す
	return (
		<div
			className={`${sizeClass} rounded-full bg-violet-600 flex items-center justify-center text-white ${textClass}`}
		>
			{initial}
		</div>
	);
}
