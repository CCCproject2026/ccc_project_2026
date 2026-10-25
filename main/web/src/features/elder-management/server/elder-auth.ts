import "server-only";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function checkNurseAuth() {
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
