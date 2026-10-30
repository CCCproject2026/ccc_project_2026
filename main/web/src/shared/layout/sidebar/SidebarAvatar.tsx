"use client";

import { useUser } from "@clerk/nextjs";
import Image from "next/image";

// サイドバー左下に出す丸いプロフィール写真
// ProfileAvatar（マイページ）と同じく、写真は DB ではなく Clerk の user.imageUrl を使う
export function SidebarAvatar({
	initial,
	name,
}: {
	initial: string; // 写真がないときに出す1文字
	name: string; // 画像の代わりの説明（alt）に使う
}) {
	const { isLoaded, user } = useUser();

	// Clerk は写真がなくても自動の画像を返すので、hasImage で「本人が登録したか」を見る
	if (isLoaded && user?.hasImage) {
		return (
			<Image
				src={user.imageUrl}
				alt={`${name}のプロフィール写真`}
				width={36}
				height={36}
				className="w-9 h-9 shrink-0 rounded-full object-cover"
			/>
		);
	}

	// 写真がない（または Clerk の読み込み中）ときは今までどおり violet の丸にイニシャルを出す
	return (
		<div className="w-9 h-9 shrink-0 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-medium">
			{initial}
		</div>
	);
}
