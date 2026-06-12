export interface Alarm {
  id: string;
  timestamp: string;
  severity: "low" | "medium" | "high";
  description: string;
}
