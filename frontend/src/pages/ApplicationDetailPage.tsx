import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'

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
            Status: {statusLabel(event.to_status)}
          </p>
        ) : null}

        {event.event_type === 'STATUS_CHANGED' ? (
          <p className="timeline-meta">
            {statusLabel(event.from_status)} → {statusLabel(event.to_status)}
          </p>
        ) : null}

        <p className="timeline-time">{formatDateTime(event.occurred_at)}</p>

        {event.notes ? (
          <p className="timeline-notes">{event.notes}</p>
        ) : null}
      </div>
    </li>
  )
}

export function ApplicationDetailPage() {
  const { id: idParam } = useParams()
  const applicationId = Number(idParam)

  const [application, setApplication] = useState<Application | null>(null)
  const [events, setEvents] = useState<ApplicationEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isNotFound, setIsNotFound] = useState(false)
  const [timelineError, setTimelineError] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
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

  if (isLoading) {
    return (
      <div className="detail-page">
        <Link to="/applications" className="detail-back">
          ← Back to Applications
        </Link>
        <div className="detail-state" role="status">
          <p>Loading application...</p>
        </div>
      </div>
    )
  }

  if (isNotFound) {
    return (
      <div className="detail-page">
        <div className="detail-state">
          <p className="detail-state-title">Application not found.</p>
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
      <Link to="/applications" className="detail-back">
        ← Back to Applications
      </Link>

      <header className="detail-header">
        <div className="detail-header-main">
          <h1>{application.company}</h1>
          <p className="detail-position">{application.position}</p>
          <div className="detail-header-status">
            <StatusBadge status={application.status} />
          </div>
        </div>
        <button
          type="button"
          className="detail-edit"
          onClick={() => setIsEditOpen(true)}
        >
          Edit
        </button>
      </header>

      <div className="detail-layout">
        <section
          className="detail-panel"
          aria-labelledby="application-details-heading"
        >
          <h2 id="application-details-heading">Application Details</h2>
          <dl className="detail-list">
            {application.location ? (
              <DetailRow label="Location">{application.location}</DetailRow>
            ) : null}
            {application.salary ? (
              <DetailRow label="Salary">{application.salary}</DetailRow>
            ) : null}
            {application.applied_at ? (
              <DetailRow label="Applied">
                {formatDate(application.applied_at)}
              </DetailRow>
            ) : null}
            {application.deadline ? (
              <DetailRow label="Deadline">
                {formatDate(application.deadline)}
              </DetailRow>
            ) : null}
            {application.job_url ? (
              <DetailRow label="Job URL">
                <a
                  href={application.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View job posting
                </a>
              </DetailRow>
            ) : null}
            {application.notes ? (
              <DetailRow label="Notes">
                <span className="detail-notes">{application.notes}</span>
              </DetailRow>
            ) : null}
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
    </div>
  )
}
