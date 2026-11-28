// src/app/api/staff/invitations/route.ts
import { NextResponse } from "next/server";
import { staffInviteSchema } from "@/features/staff-management/schemas/staff-input";
import {
	inviteStaff,
	listInvitations,
} from "@/features/staff-management/server/staff-service";
import { errorResponse, readJsonBody } from "@/shared/lib/api-error";
import { requireRole } from "@/shared/lib/auth";

// 登録待ち（PENDING）一覧
export async function GET() {
	try {
		await requireRole("NURSE");
		const response = await listInvitations();
		return NextResponse.json(response);
	} catch (error) {
		return errorResponse(error);
	}
}

// 新規招待
export async function POST(request: Request) {
	try {
		await requireRole("NURSE");
		const input = staffInviteSchema.parse(await readJsonBody(request));
		const response = await inviteStaff(input);
		return NextResponse.json(response, { status: 201 });
	} catch (error) {
		return errorResponse(error);
	}
}
