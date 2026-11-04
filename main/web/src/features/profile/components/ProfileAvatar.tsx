"use client";

import { useUser } from "@clerk/nextjs";
import Image from "next/image";

// マイページのヘッダーに出すプロフィール写真
// 写真の正は Clerk なので DB には保存せず、Clerk の user.imageUrl をそのまま表示する
// Clerk のモーダルで写真を変えると useUser() の値が変わるので、再読み込みしなくても表示が変わる
export function ProfileAvatar({
	initial,
	name,
	isNurse,
}: {
	initial: string; // 写真がないときに出す1文字
	name: string; // 画像の代わりの説明（alt）に使う
	isNurse: boolean;
}) {
	const { isLoaded, user } = useUser();

	// Clerk は写真がなくても自動の画像を返すので、hasImage で「本人が登録したか」を見る
	if (isLoaded && user?.hasImage) {
		return (
			<Image
				src={user.imageUrl}
				alt={`${name}のプロフィール写真`}
				width={64}
				height={64}
				className="w-16 h-16 shrink-0 rounded-2xl object-cover"
			/>
		);
	}

	// 写真がない（または Clerk の読み込み中）ときはイニシャルを出す
	return (
		<div
			className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-2xl font-bold ${
				isNurse ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-[#7c3aed]"
			}`}
		>
			{initial}
		</div>
	);
}
