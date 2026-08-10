import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from '../types/application'

type StatusBadgeProps = {
  status: ApplicationStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {APPLICATION_STATUS_LABELS[status]}
    </span>
  )
}
