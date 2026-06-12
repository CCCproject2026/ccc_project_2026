import { NextResponse } from "next/server";
import { updateUserRole } from "@/lib/clerk";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  if (!body?.role) {
    return NextResponse.json({ error: "Missing role" }, { status: 400 });
  }

  const updated = await updateUserRole(params.id, body.role);
  return NextResponse.json(updated);
}
