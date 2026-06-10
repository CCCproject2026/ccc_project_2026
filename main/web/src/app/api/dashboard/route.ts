import { DashboardData } from '@/features/dashboard/types';

export async function GET() {
  const data: DashboardData = {
    metrics: [
      { id: '1', label: 'Active devices', value: 24 },
      { id: '2', label: 'Alerts sent', value: 7 },
      { id: '3', label: 'Response rate', value: 98, unit: '%'},
    ],
    lastUpdated: new Date().toLocaleString(),
  };

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}
