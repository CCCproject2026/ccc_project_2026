"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

export function Providers({
	children,
	clerkKey,
}: {
	children: ReactNode;
	clerkKey?: string;
}) {
	if (!clerkKey) {
		return <>{children}</>;
	}

	return <ClerkProvider publishableKey={clerkKey}>{children}</ClerkProvider>;
}
