// AlarmDetectedModal reads from device-management battery state and staff data, but must never import
// device-management's or staff-management's internal store/mutation logic directly.
// Only use shared/types or a public interface.
// uses shared/ui/Modal, shared/ui/Badge, shared/tokens/colors
export interface AlarmDetectedModalProps {
  open?: boolean
}

export function AlarmDetectedModal({ open = false }: AlarmDetectedModalProps) {
  return open ? <div aria-label="alarm-detected-modal-placeholder" /> : null
}
