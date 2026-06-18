// Dashboard page shell.
// uses shared/ui/StatCard, shared/ui/Table, shared/tokens/colors

import Sidebar from "@/shared/layout/sidebar/Sidebar";

export default function DashboardPage() {
	return (
		<div className="flex min-h-screen bg-gray-100">
			{/* Sidebar */}
			<Sidebar />

			{/* Main Content */}
			<div className="flex flex-1 flex-col">
				<main className="flex-1 p-6">
					<h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

					{/* Dashboard Components */}
					<div className="grid grid-cols-4 gap-6">{/* StatCard */}</div>

					<div className="mt-6">{/* ResidentGrid */}</div>
				</main>
			</div>
		</div>
	);
}
