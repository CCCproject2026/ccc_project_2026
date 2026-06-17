import { NextResponse } from "next/server";
import { listStaff } from "@/features/staff/api";

export async function GET() {
  return NextResponse.json(listStaff());
}
