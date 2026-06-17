import { NextResponse } from "next/server";
import { inviteStaff, listInvitations } from "@/features/staff/api";

export async function GET() {
	return NextResponse.json(listInvitations());
}

export async function POST(request: Request) {
	const body = await request.json().catch(() => null);
	if (!body?.email) {
		return NextResponse.json({ error: "Email is required" }, { status: 400 });
	}

	const invite = await inviteStaff(body.email);
	return NextResponse.json(invite, { status: 201 });
}
