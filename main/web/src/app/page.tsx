import Link from "next/link";

export default function HomePage() {
	return (
		<main>
			<h1>Welcome to the Elderly Fall Prevention System</h1>
			<p>Something has changed .........</p>
			<p>
				This portal provides dashboard monitoring, device management, response
				tracking, and staff administration.
			</p>
			<div
				style={{
					marginTop: "24px",
					display: "flex",
					flexDirection: "column",
					gap: "12px",
				}}
			>
				<Link href="/login">Go to Login</Link>
				<Link href="/dashboard">Open Dashboard</Link>
				<Link href="/staff">Open Staff Management</Link>
			</div>
		</main>
	);
}
