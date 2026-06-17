// ResidentCard reads from device-management battery state and staff data, but must never import
// device-management's or staff-management's internal store/mutation logic directly.
// Only use shared/types or a public interface.
// uses shared/ui/Badge, shared/ui/BatteryBar, shared/tokens/colors
export interface ResidentCardProps {
  variant?: 'normal' | 'alarm'
}

export function ResidentCard({ variant = 'normal' }: ResidentCardProps) {
  return <section aria-label="resident-card-placeholder">{variant}</section>
}
