import { DashboardMetric } from '../types';

interface DashboardShellProps {
  metrics: DashboardMetric[];
  updatedAt: string;
}

export function DashboardShell({ metrics, updatedAt }: DashboardShellProps) {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard from DashboardShell</h1>
        <p className="text-sm text-slate-600">Last updated: {updatedAt}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.id} className="rounded-xl border p-4 shadow-sm">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="text-3xl font-bold">{metric.value}{metric.unit ?? ''}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
