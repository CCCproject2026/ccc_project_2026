import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { UpdateElderInput } from "@/features/elder-management/types/elder.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function checkAuth() {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized", status: 401 };
  return { userId };
}

async function checkNurseAuth() {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized", status: 401 };
  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: { role: true, status: true },
  });
  if (!user || user.role !== "NURSE" || user.status !== "ACTIVE") {
    return { error: "Forbidden", status: 403 };
  }

  return { userId };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await checkAuth();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const elder = await prisma.elder.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        roomNumber: true,
        status: true,
        dateOfBirth: true,
        gender: true,
        createdAt: true,
        updatedAt: true,
        deviceAssignments: {
          where: { unassignedAt: null },
          select: { deviceId: true },
          take: 1,
        },
      },
    });

    if (!elder) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...elder,
      currentDeviceId: elder.deviceAssignments[0]?.deviceId ?? null,
      deviceAssignments: undefined,
    });
  } catch (error) {
    console.error("GET /api/elders/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await checkNurseAuth();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const body = await request.json();
    const { firstName, lastName, roomNumber, dateOfBirth, gender, status } = body as UpdateElderInput;

    const updateData: Record<string, unknown> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
    if (gender !== undefined) updateData.gender = gender;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const elder = await prisma.elder.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(elder);
  } catch (error) {
    console.error("PATCH /api/elders/[id] error:", error);
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await checkNurseAuth();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;

    await prisma.elder.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/elders/[id] error:", error);
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}