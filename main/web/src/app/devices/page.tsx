import { Sidebar } from "@/shared/layout/sidebar/Sidebar";

export default function DevicesPage() {
	return (
		<div className="flex">
			<Sidebar />
			<main className="flex-1 bg-gray-50 p-6">
				<h1>Devices</h1>
			</main>
		</div>
	);
}
