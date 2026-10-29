"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useState } from "react";
import {
	SIGN_IN_URL,
	SIGN_UP_URL,
} from "@/features/auth/constants/auth.constant";

export function Providers({
	children,
	clerkKey,
}: {
	children: ReactNode;
	clerkKey?: string;
}) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 30_000,
						refetchOnWindowFocus: false,
						retry: 1,
					},
				},
			}),
	);

	if (!clerkKey) {
		return (
			<QueryClientProvider client={queryClient}>
				{children}
				<ReactQueryDevtools initialIsOpen={false} />
			</QueryClientProvider>
		);
	}

	return (
		<ClerkProvider
			publishableKey={clerkKey}
			// サインイン・サインアップの送り先を、このアプリの画面にする
			// （指定しないと Clerk 自身のページに飛んでしまう）
			signInUrl={SIGN_IN_URL}
			signUpUrl={SIGN_UP_URL}
		>
			<QueryClientProvider client={queryClient}>
				{children}
				<ReactQueryDevtools initialIsOpen={false} />
			</QueryClientProvider>
		</ClerkProvider>
	);
}
