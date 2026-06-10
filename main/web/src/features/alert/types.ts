export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertData {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  createdAt: string;
}
