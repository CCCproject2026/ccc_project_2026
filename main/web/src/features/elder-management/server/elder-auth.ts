import "server-only";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function checkNurseAuth() {
	const { userId } = await auth();
	if (!userId) return { error: "Unauthorized", status: 401 };
	const user = await prisma.user.findUnique({
		where: { clerkUserId: userId },
		select: { id: true, role: true, status: true },
	});
	if (user?.role !== "NURSE" || user.status !== "ACTIVE") {
		return { error: "Forbidden", status: 403 };
	}

	// staffId は DB の User.id。退所で割当を終了したときの監査記録（操作者）に使う
	return { userId, staffId: user.id };
}
