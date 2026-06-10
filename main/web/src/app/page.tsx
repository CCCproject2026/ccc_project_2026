'use client';

import { FeatureLayout } from '@/features/shared/components/FeatureLayout';
import { DashboardShell } from '@/features/dashboard/components/DashboardShell';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';

export default function HomePage() {
  const { data, loading, error } = useDashboardData();

  return (
    <FeatureLayout title="Dashboard">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading && <p>Loading dashboard...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {data ? <DashboardShell metrics={data.metrics} updatedAt={data.lastUpdated} /> : null}
      </div>
    </FeatureLayout>
  );
}
