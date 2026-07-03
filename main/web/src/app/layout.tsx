import "./globals.css";
import { Providers } from "./providers";

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
				<main>
					<Providers>{children}</Providers>
				</main>
			</body>
		</html>
	);
}
