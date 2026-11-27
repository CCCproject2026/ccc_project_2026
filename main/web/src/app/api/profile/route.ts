// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { profileUpdateSchema } from "@/features/profile/schemas/profile-input";
import { updateMyProfile } from "@/features/profile/server/profile-service";
import { errorResponse, readJsonBody } from "@/shared/lib/api-error";
import { requireStaff } from "@/shared/lib/auth";

// 自分のプロフィールを更新する
// パスに :id はない。更新するのは、いつもログイン中の本人の行だけ
export async function PATCH(request: Request) {
	try {
		const loginUser = await requireStaff();
		const input = profileUpdateSchema.parse(await readJsonBody(request));
		const profile = await updateMyProfile(loginUser.id, input);
		return NextResponse.json({ profile });
	} catch (error) {
		return errorResponse(error);
	}
}
