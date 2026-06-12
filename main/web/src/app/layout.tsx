import Link from "next/link";

export const metadata = {
  title: "Elderly Fall Prevention",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header style={{ padding: "16px", borderBottom: "1px solid #ddd" }}>
          <nav style={{ display: "flex", gap: "16px" }}>
            <Link href="/">Home</Link>
            <Link href="/login">Login</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/devices">Devices</Link>
            <Link href="/response">Response</Link>
            <Link href="/staff">Staff</Link>
          </nav>
        </header>
        <main style={{ padding: "24px" }}>{children}</main>
      </body>
    </html>
  );
}
