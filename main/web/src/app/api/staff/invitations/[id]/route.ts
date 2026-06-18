// src/app/api/staff/invitations/[id]/route.ts
import { NextResponse } from "next/server";

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	// Next.js 15のルールに従って params を await する
	const { id } = await params;

	// ビルドを通すための仮のレスポンス（本来の処理に合わせてPATCHやGETなどに変更してください）
	return NextResponse.json({
		success: true,
		message: `Invitation ${id} processed`,
	});
}
