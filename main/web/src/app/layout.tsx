import "./globals.css";

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
				<main style={{ padding: "24px" }}>{children}</main>
			</body>
		</html>
	);
}
