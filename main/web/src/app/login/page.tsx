import { Sidebar } from "@/shared/layout/sidebar/Sidebar";

export default function LoginPage() {
	return (
		<main>
			<div className="flex">
				<Sidebar />
				<main className="flex-1 bg-gray-50 p-6">
					<h1>Login</h1>
				</main>
			</div>
		</main>
	);
}
