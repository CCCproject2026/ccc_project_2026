import { NextResponse } from "next/server";
import { revokeInvitation } from "@/features/staff/api";

export async function DELETE(
	request: Request,
	{ params }: { params: { id: string } },
) {
	await revokeInvitation(params.id);
	return NextResponse.json({ ok: true });
}
