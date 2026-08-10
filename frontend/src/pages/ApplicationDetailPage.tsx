import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { DeleteApplicationModal } from '../components/DeleteApplicationModal'
import { EditApplicationModal } from '../components/EditApplicationModal'
import { StatusBadge } from '../components/StatusBadge'
import { ApiError } from '../services/api'
import {
  getApplication,
  getApplicationEvents,
} from '../services/applications'
import type { Application, ApplicationStatus } from '../types/application'
import { APPLICATION_STATUS_LABELS } from '../types/application'
import type { ApplicationEvent } from '../types/event'
import { formatDate, formatDateTime } from '../utils/datetime'

function statusLabel(status: ApplicationStatus | null): string {
  if (!status) {
    return '—'
  }
  return APPLICATION_STATUS_LABELS[status]
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDeadlineEmphasis(value: string | null): {
  label: string
  urgency: 'none' | 'today' | 'soon' | 'normal'
} {
  if (!value) {
    return { label: '—', urgency: 'none' }
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { label: value, urgency: 'normal' }
  }

  const today = startOfLocalDay(new Date())
  const target = startOfLocalDay(date)
  const days = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (days === 0) {
    return { label: 'Due today', urgency: 'today' }
  }
  if (days === 1) {
    return { label: 'Due in 1 day', urgency: 'soon' }
  }
  if (days > 1 && days <= 3) {
    return { label: `Due in ${days} days`, urgency: 'soon' }
  }

  return {
    label: date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    urgency: 'normal',
  }
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="3.5"
        y="7"
        width="17"
        height="12.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M3.5 12h17" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function TimelineItem({ event }: { event: ApplicationEvent }) {
  const title =
    event.event_type === 'CREATED' ? 'Application created' : 'Status changed'

  return (
    <li className="timeline-item">
      <div className="timeline-marker" aria-hidden="true" />
      <div className="timeline-content">
        <div className="timeline-content-card">
          <p className="timeline-title">{title}</p>

          {event.event_type === 'CREATED' && event.to_status ? (
            <p className="timeline-meta">
              <StatusBadge status={event.to_status} />
            </p>
          ) : null}

          {event.event_type === 'STATUS_CHANGED' ? (
            <p className="timeline-meta timeline-meta-change">
              <span className="timeline-status-pair">
                {event.from_status ? (
                  <StatusBadge status={event.from_status} />
                ) : (
                  <span>{statusLabel(event.from_status)}</span>
                )}
                <span className="timeline-arrow" aria-hidden="true">
                  →
                </span>
                {event.to_status ? (
                  <StatusBadge status={event.to_status} />
                ) : (
                  <span>{statusLabel(event.to_status)}</span>
                )}
              </span>
              <span className="visually-hidden">
                {statusLabel(event.from_status)} to{' '}
                {statusLabel(event.to_status)}
              </span>
            </p>
          ) : null}

          <p className="timeline-time">
            <time dateTime={event.occurred_at}>
              {formatDateTime(event.occurred_at)}
            </time>
          </p>

          {event.notes ? (
            <p className="timeline-notes">{event.notes}</p>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function DetailSkeleton() {
  return (
    <div
      className="detail-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="visually-hidden">Loading application…</span>
      <div className="detail-skeleton-header" />
      <div className="detail-skeleton-grid">
        <div className="detail-skeleton-panel" />
        <div className="detail-skeleton-panel" />
      </div>
    </div>
  )
}

export function ApplicationDetailPage() {
  const navigate = useNavigate()
  const { id: idParam } = useParams()
  const applicationId = Number(idParam)

  const [application, setApplication] = useState<Application | null>(null)
  const [events, setEvents] = useState<ApplicationEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isNotFound, setIsNotFound] = useState(false)
  const [timelineError, setTimelineError] = useState<string | null>(null)
  const [isTimelineLoading, setIsTimelineLoading] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!Number.isFinite(applicationId) || applicationId <= 0) {
        setIsLoading(false)
        setIsNotFound(true)
        setApplication(null)
        setEvents([])
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)
      setIsNotFound(false)
      setTimelineError(null)

      try {
        const app = await getApplication(applicationId)
        if (cancelled) {
          return
        }
        setApplication(app)

        try {
          const timeline = await getApplicationEvents(applicationId)
          if (!cancelled) {
            setEvents(timeline.items)
          }
        } catch {
          if (!cancelled) {
            setEvents([])
            setTimelineError("Couldn't load timeline.")
          }
        }
      } catch (err) {
        if (cancelled) {
          return
        }
        setApplication(null)
        setEvents([])
        if (err instanceof ApiError && err.status === 404) {
          setIsNotFound(true)
          setError(null)
        } else {
          setIsNotFound(false)
          setError('Unable to load application. Please try again.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [applicationId, reloadKey])

  async function handleTimelineRetry() {
    if (!Number.isFinite(applicationId) || applicationId <= 0) {
      return
    }

    setIsTimelineLoading(true)
    setTimelineError(null)

    try {
      const timeline = await getApplicationEvents(applicationId)
      setEvents(timeline.items)
    } catch {
      setEvents([])
      setTimelineError("Couldn't load timeline.")
    } finally {
      setIsTimelineLoading(false)
    }
  }

  function handleRetry() {
    setReloadKey((key) => key + 1)
  }

  function handleUpdated() {
    setReloadKey((key) => key + 1)
  }

  function handleDeleted() {
    navigate('/applications')
  }

  if (isLoading) {
    return (
      <div className="detail-page">
        <nav className="detail-nav" aria-label="Application navigation">
          <Link to="/applications" className="detail-back">
            ← Back to applications
          </Link>
        </nav>
        <DetailSkeleton />
      </div>
    )
  }

  if (isNotFound) {
    return (
      <div className="detail-page">
        <nav className="detail-nav" aria-label="Application navigation">
          <Link to="/applications" className="detail-back">
            ← Back to applications
          </Link>
        </nav>
        <div className="detail-state">
          <p className="detail-state-title">Application not found</p>
          <p className="detail-state-copy">
            This application may have been deleted, or the link may be
            incorrect.
          </p>
          <Link to="/applications" className="btn btn-primary detail-back-button">
            Back to applications
          </Link>
        </div>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="detail-page">
        <nav className="detail-nav" aria-label="Application navigation">
          <Link to="/applications" className="detail-back">
            ← Back to applications
          </Link>
        </nav>
        <div className="detail-state detail-state-error" role="alert">
          <p className="detail-state-title">
            Couldn&apos;t load this application
          </p>
          <p className="detail-state-copy">
            {error ?? 'Unable to load application. Please try again.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRetry}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const deadline = formatDeadlineEmphasis(application.deadline)

  return (
    <div className="detail-page">
      <nav className="detail-nav" aria-label="Application navigation">
        <Link to="/applications" className="detail-back">
          ← Back to applications
        </Link>
      </nav>

      <header className="detail-header">
        <div className="detail-header-main">
          <p className="detail-eyebrow">Application</p>
          <div className="detail-title-row">
            <span className="detail-brand-mark" aria-hidden="true">
              <BriefcaseIcon />
            </span>
            <div className="detail-title-copy">
              <h1>{application.company}</h1>
              <p className="detail-position">{application.position}</p>
            </div>
          </div>
          <div className="detail-header-meta">
            <StatusBadge status={application.status} />
            {application.location ? (
              <span className="detail-meta-chip">{application.location}</span>
            ) : null}
          </div>
        </div>

        <div className="detail-header-actions">
          <button
            type="button"
            className="btn btn-primary detail-edit"
            onClick={() => setIsEditOpen(true)}
          >
            Edit application
          </button>
          <button
            type="button"
            className="btn detail-delete"
            onClick={() => setIsDeleteOpen(true)}
          >
            Delete application
          </button>
        </div>
      </header>

      <div className="detail-layout">
        <div className="detail-main">
          <section
            className="detail-panel"
            aria-labelledby="application-details-heading"
          >
            <div className="detail-panel-header">
              <h2 id="application-details-heading">Application details</h2>
              <p className="detail-panel-lead">
                Key information for this opportunity.
              </p>
            </div>
            <dl className="detail-list">
              <DetailRow label="Location">
                {application.location || '—'}
              </DetailRow>
              <DetailRow label="Applied">
                {application.applied_at
                  ? formatDate(application.applied_at)
                  : '—'}
              </DetailRow>
              <DetailRow label="Deadline">
                <span
                  className={`deadline-cell deadline-${deadline.urgency}`}
                >
                  {deadline.label}
                </span>
              </DetailRow>
              <DetailRow label="Salary">{application.salary || '—'}</DetailRow>
              <DetailRow label="Job URL">
                {application.job_url ? (
                  <a
                    className="detail-job-link"
                    href={application.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View job posting ↗
                  </a>
                ) : (
                  '—'
                )}
              </DetailRow>
              <DetailRow label="Updated">
                {formatDateTime(application.updated_at)}
              </DetailRow>
            </dl>
          </section>

          <section
            className="detail-panel detail-notes-panel"
            aria-labelledby="application-notes-heading"
          >
            <div className="detail-panel-header">
              <h2 id="application-notes-heading">Notes</h2>
            </div>
            {application.notes ? (
              <p className="detail-notes">{application.notes}</p>
            ) : (
              <p className="detail-notes-empty">—</p>
            )}
          </section>
        </div>

        <section
          className="detail-panel detail-timeline-panel"
          aria-labelledby="application-timeline-heading"
        >
          <div className="detail-panel-header">
            <h2 id="application-timeline-heading">Application timeline</h2>
            <p className="detail-panel-lead">
              History of changes to this application.
            </p>
          </div>

          {timelineError ? (
            <div className="timeline-error" role="alert">
              <p>{timelineError}</p>
              <button
                type="button"
                className="btn btn-secondary timeline-retry"
                onClick={() => void handleTimelineRetry()}
                disabled={isTimelineLoading}
              >
                {isTimelineLoading ? 'Retrying…' : 'Try again'}
              </button>
            </div>
          ) : null}

          {!timelineError && events.length === 0 ? (
            <p className="timeline-empty">No timeline events yet.</p>
          ) : null}

          {!timelineError && events.length > 0 ? (
            <ol className="timeline-list">
              {events.map((event) => (
                <TimelineItem key={event.id} event={event} />
              ))}
            </ol>
          ) : null}
        </section>
      </div>

      <EditApplicationModal
        open={isEditOpen}
        application={application}
        onClose={() => setIsEditOpen(false)}
        onUpdated={handleUpdated}
      />

      <DeleteApplicationModal
        open={isDeleteOpen}
        applicationId={application.id}
        company={application.company}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
