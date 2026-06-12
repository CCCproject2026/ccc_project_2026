import { NextResponse } from "next/server";
import { staffDb } from "@/lib/staff-db";

export async function GET() {
  const staff = staffDb.getStaff();
  return NextResponse.json(staff);
}
