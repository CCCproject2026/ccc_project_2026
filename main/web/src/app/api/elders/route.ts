import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { CreateElderInput, ElderStatus, Gender } from "@/features/elder-management/types/elder.types";

const genderToPrisma = (g: Gender) => {
  switch (g) {
    case "男性": return "MALE";
    case "女性": return "FEMALE";
    case "その他": return "OTHER";
    case "回答しない": return "PREFER_NOT_TO_SAY";
    default: return g;
  }
};

const genderFromPrisma = (g: string): Gender => {
  switch (g) {
    case "MALE": return "男性";
    case "FEMALE": return "女性";
    case "OTHER": return "その他";
    case "PREFER_NOT_TO_SAY": return "回答しない";
    default: return g as Gender;
  }
};

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)));
    const status = searchParams.get("status") as ElderStatus | null;
    const q = searchParams.get("q") || undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { roomNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    const [elders, total, allTotal, byStatus] = await Promise.all([
      prisma.elder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
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
      }),
      prisma.elder.count({ where }),
      prisma.elder.count(),
      prisma.elder.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const data = elders.map((e) => ({
      ...e,
      gender: genderFromPrisma(e.gender),
      currentDeviceId: e.deviceAssignments[0]?.deviceId ?? null,
      deviceAssignments: undefined,
    }));

    const summary = {
      total: allTotal,
      active: byStatus.find((s) => s.status === "ACTIVE")?._count._all ?? 0,
      inactive: byStatus.find((s) => s.status === "INACTIVE")?._count._all ?? 0,
    };

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      summary,
    });
  } catch (error) {
    console.error("GET /api/elders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { role: true, status: true },
    });
    if (!user || user.role !== "NURSE" || user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }


    const body = await request.json();
    const { firstName, lastName, roomNumber, dateOfBirth, gender } = body as CreateElderInput;

    if (!firstName || !lastName || !roomNumber || !dateOfBirth || !gender) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const elder = await prisma.elder.create({
      data: {
        firstName,
        lastName,
        roomNumber,
        dateOfBirth: new Date(dateOfBirth),
        gender: genderToPrisma(gender),
        status: "ACTIVE",
      },
    });

    return NextResponse.json(elder, { status: 201 });
  } catch (error) {
    console.error("POST /api/elders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}