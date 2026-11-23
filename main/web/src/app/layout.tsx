import "./globals.css";
import { Providers } from "./providers";

// ルート layout には force-dynamic を置かない。
// 認証（auth() / getLoginUser()）や DB を読む画面は Next.js が動的と判定するので、
// /login や /sign-up のような公開画面まで毎回レンダリングされるのを防ぐ。
// ※ (authenticated) 配下は layout が auth() を、account-status は getLoginUser() を読む。

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
