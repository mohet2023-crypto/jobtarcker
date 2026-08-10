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

function TimelineItem({ event }: { event: ApplicationEvent }) {
  const title =
    event.event_type === 'CREATED'
      ? 'Application created'
      : 'Status changed'

  return (
    <li className="timeline-item">
      <div className="timeline-marker" aria-hidden="true" />
      <div className="timeline-content">
        <p className="timeline-title">{title}</p>

        {event.event_type === 'CREATED' && event.to_status ? (
          <p className="timeline-meta">
            <span className="timeline-meta-label">Status</span>
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
              {statusLabel(event.from_status)} to {statusLabel(event.to_status)}
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
    </li>
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
            setTimelineError('Unable to load application history.')
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
        <Link to="/applications" className="detail-back">
          ← Back to Applications
        </Link>
        <div
          className="detail-state detail-state-loading"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <p className="detail-state-title">Loading application…</p>
          <p>Fetching details and timeline.</p>
        </div>
      </div>
    )
  }

  if (isNotFound) {
    return (
      <div className="detail-page">
        <Link to="/applications" className="detail-back">
          ← Back to Applications
        </Link>
        <div className="detail-state">
          <p className="detail-state-title">Application not found</p>
          <p>
            This application may have been deleted, or the link may be
            incorrect.
          </p>
          <Link to="/applications" className="detail-back-button">
            Back to Applications
          </Link>
        </div>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="detail-page">
        <Link to="/applications" className="detail-back">
          ← Back to Applications
        </Link>
        <div className="detail-state detail-state-error" role="alert">
          <p className="detail-state-title">Something went wrong</p>
          <p>{error ?? 'Unable to load application. Please try again.'}</p>
          <button
            type="button"
            className="applications-retry"
            onClick={handleRetry}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="detail-page">
      <nav className="detail-nav" aria-label="Application navigation">
        <Link to="/applications" className="detail-back">
          ← Back to Applications
        </Link>
      </nav>

      <header className="detail-header">
        <div className="detail-header-main">
          <h1>{application.company}</h1>
          <p className="detail-position">{application.position}</p>
          <div className="detail-header-status">
            <StatusBadge status={application.status} />
          </div>
        </div>
        <div className="detail-header-actions">
          <button
            type="button"
            className="detail-edit"
            onClick={() => setIsEditOpen(true)}
          >
            Edit Application
          </button>
          <button
            type="button"
            className="detail-delete"
            onClick={() => setIsDeleteOpen(true)}
          >
            Delete Application
          </button>
        </div>
      </header>

      <div className="detail-layout">
        <section
          className="detail-panel"
          aria-labelledby="application-details-heading"
        >
          <h2 id="application-details-heading">Application Details</h2>
          <dl className="detail-list">
            <DetailRow label="Location">
              {application.location || '—'}
            </DetailRow>
            <DetailRow label="Salary">{application.salary || '—'}</DetailRow>
            <DetailRow label="Applied">
              {application.applied_at
                ? formatDate(application.applied_at)
                : '—'}
            </DetailRow>
            <DetailRow label="Deadline">
              {application.deadline ? formatDate(application.deadline) : '—'}
            </DetailRow>
            <DetailRow label="Job URL">
              {application.job_url ? (
                <a
                  href={application.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View job posting
                </a>
              ) : (
                '—'
              )}
            </DetailRow>
            <DetailRow label="Notes">
              {application.notes ? (
                <span className="detail-notes">{application.notes}</span>
              ) : (
                '—'
              )}
            </DetailRow>
            <DetailRow label="Created">
              {formatDateTime(application.created_at)}
            </DetailRow>
            <DetailRow label="Updated">
              {formatDateTime(application.updated_at)}
            </DetailRow>
          </dl>
        </section>

        <section
          className="detail-panel"
          aria-labelledby="application-timeline-heading"
        >
          <h2 id="application-timeline-heading">Application Timeline</h2>
          <p className="detail-panel-lead">
            Automatic history of this application's progress.
          </p>

          {timelineError ? (
            <p className="timeline-error" role="alert">
              {timelineError}
            </p>
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
