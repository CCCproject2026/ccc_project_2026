import "./globals.css";
import { Providers } from "./providers";

export const dynamic = "force-dynamic";

export const metadata = {
	title: "Elderly Fall Prevention",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="ja">
			<body>
				<Providers clerkKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
					{children}
				</Providers>
			</body>
		</html>
	);
}
