import { NextResponse } from "next/server";
import { revokeInvitation } from "@/lib/clerk";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  await revokeInvitation(params.id);
  return NextResponse.json({ ok: true });
}
