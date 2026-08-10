import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from '../types/application'

type StatusBadgeProps = {
  status: ApplicationStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = APPLICATION_STATUS_LABELS[status]

  return (
    <span
      className={`status-badge status-${status.toLowerCase()}`}
      title={label}
    >
      {label}
    </span>
  )
}
