export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder Stat Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-sm font-medium text-gray-500">Active Sensors</h2>
          <p className="text-3xl font-bold text-gray-900">4</p>
        </div>
        
        {/* Placeholder Status Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-sm font-medium text-gray-500">System Status</h2>
          <p className="text-lg font-semibold text-green-600">Operational</p>
        </div>

        {/* Placeholder Recent Alerts */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 col-span-1 md:col-span-2 lg:col-span-1">
          <h2 className="text-sm font-medium text-gray-500 mb-4">Recent Alerts</h2>
          <ul className="space-y-2">
            <li className="text-sm text-gray-600">No recent alerts.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
