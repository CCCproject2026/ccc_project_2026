export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-500 to-purple-600 text-transparent bg-clip-text">
          Elderly Fall Prevention
        </h1>
        <p className="text-gray-600 mb-6">
          Monitoring and alert system for enhanced safety.
        </p>
        <a href="/dashboard" className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded hover:bg-blue-700 transition">
          Kyaw Htin Hein
        </a>
      </div>
    </main>
  );
}
