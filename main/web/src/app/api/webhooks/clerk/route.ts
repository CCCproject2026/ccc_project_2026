import { NextResponse } from "next/server";
import { staffDb } from "@/features/staff/data/staff-db";
import { ClerkWebhookEvent } from "@/types/clerk";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // TODO: Verify the request payload using Clerk / Svix webhook signing.
  const event = body as ClerkWebhookEvent;

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const clerkId = String(event.data.object.id ?? "");
      const email = String(event.data.object.email ?? "");
      const role = String(event.data.object.public_metadata?.role ?? "staff") as "admin" | "manager" | "staff";
      staffDb.addOrUpdateStaff(clerkId, email, role);
      break;
    }
    case "invitation.accepted": {
      const clerkId = String(event.data.object.id ?? "");
      const email = String(event.data.object.email ?? "");
      staffDb.addOrUpdateStaff(clerkId, email, "staff");
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
