export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  unit?: string;
}

export interface DashboardData {
  metrics: DashboardMetric[];
  lastUpdated: string;
}
