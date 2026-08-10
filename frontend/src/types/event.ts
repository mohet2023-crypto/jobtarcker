import type { ApplicationStatus } from './application'

export type ApplicationEventType = 'CREATED' | 'STATUS_CHANGED'

export type ApplicationEvent = {
  id: number
  event_type: ApplicationEventType
  from_status: ApplicationStatus | null
  to_status: ApplicationStatus | null
  occurred_at: string
  notes: string | null
}

export type ApplicationEventsResponse = {
  items: ApplicationEvent[]
}
