import Link from "next/link";

export default function LoginPage() {
	return (
		<main>
			<h1>Login</h1>
			<p>Use Clerk or the app sign-in flow to access the staff portal.</p>
			<Link href="/dashboard">Continue to Dashboard</Link>
		</main>
	);
}
