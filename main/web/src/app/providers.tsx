"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
	const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

	if (!hasClerkKey) {
		return <>{children}</>;
	}

	return <ClerkProvider>{children}</ClerkProvider>;
}
