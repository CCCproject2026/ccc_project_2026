import { NextResponse } from "next/server";
import { inviteUser } from "@/lib/clerk";
import { staffDb } from "@/lib/staff-db";

export async function GET() {
  return NextResponse.json(staffDb.getInvitations());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const invite = await inviteUser(body.email);
  return NextResponse.json(invite, { status: 201 });
}
