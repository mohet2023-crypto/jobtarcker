import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { CreateApplicationModal } from '../components/CreateApplicationModal'
import {
  getDashboardStats,
  getUpcomingDeadlines,
} from '../services/dashboard'
import type {
  ApplicationStatus,
  DashboardStats,
  UpcomingDeadline,
} from '../types/dashboard'

const STATUS_ORDER: ApplicationStatus[] = [
  'SAVED',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
]

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
}

function formatDaysRemaining(days: number): string {
  if (days < 0) {
    const overdue = Math.abs(days)
    if (overdue === 1) {
      return '1 day overdue'
    }
    return `${overdue} days overdue`
  }
  if (days === 0) {
    return 'Due today'
  }
  if (days === 1) {
    return '1 day left'
  }
  return `${days} days left`
}

function formatDeadline(deadline: string): string {
  const date = new Date(deadline)
  if (Number.isNaN(date.getTime())) {
    return deadline
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function urgencyClass(daysRemaining: number): string {
  if (daysRemaining < 0) {
    return 'urgency-overdue'
  }
  if (daysRemaining === 0) {
    return 'urgency-today'
  }
  if (daysRemaining <= 3) {
    return 'urgency-soon'
  }
  return 'urgency-normal'
}

function statusBarWidth(count: number, total: number): string {
  if (total <= 0 || count <= 0) {
    return '0%'
  }
  return `${(count / total) * 100}%`
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
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

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 3.5v3M16 3.5v3M3.5 10h17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 8v4.25L15 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckCalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 3.5v3M16 3.5v3M3.5 10h17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9 15.2 11 17l4-4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DashboardHeader({
  onAddApplication,
  showAdd,
}: {
  onAddApplication: () => void
  showAdd: boolean
}) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header-copy">
        <h1>Your job search</h1>
        <p className="dashboard-lead">
          Track your applications, monitor your progress, and stay ahead of
          upcoming deadlines.
        </p>
      </div>
      {showAdd ? (
        <button
          type="button"
          className="btn btn-primary dashboard-add"
          onClick={onAddApplication}
        >
          + Add Application
        </button>
      ) : null}
    </header>
  )
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [upcoming, setUpcoming] = useState<UpcomingDeadline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setIsLoading(true)
      setError(null)

      try {
        const [dashboardStats, upcomingResponse] = await Promise.all([
          getDashboardStats(),
          getUpcomingDeadlines(10),
        ])

        if (!cancelled) {
          setStats(dashboardStats)
          setUpcoming(upcomingResponse.items)
        }
      } catch {
        if (!cancelled) {
          setStats(null)
          setUpcoming([])
          setError('Unable to load dashboard. Please try again.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  function handleRetry() {
    setReloadKey((key) => key + 1)
  }

  function handleCreated() {
    setIsCreateOpen(false)
    setReloadKey((key) => key + 1)
  }

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <DashboardHeader
          showAdd={false}
          onAddApplication={() => setIsCreateOpen(true)}
        />
        <div className="dashboard-skeleton" role="status" aria-live="polite">
          <span className="visually-hidden">Loading dashboard…</span>
          <div className="dashboard-summary">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
          <div className="dashboard-grid">
            <div className="skeleton-panel" />
            <div className="skeleton-panel" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="dashboard-page">
        <DashboardHeader
          showAdd={false}
          onAddApplication={() => setIsCreateOpen(true)}
        />
        <div className="dashboard-state dashboard-state-error" role="alert">
          <p className="dashboard-error">
            {error ?? 'Unable to load dashboard. Please try again.'}
          </p>
          <button
            type="button"
            className="btn btn-primary dashboard-retry"
            onClick={handleRetry}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const total = stats.total_applications
  const isEmpty = total === 0

  return (
    <div className="dashboard-page">
      <DashboardHeader
        showAdd
        onAddApplication={() => setIsCreateOpen(true)}
      />

      <CreateApplicationModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      <section className="dashboard-summary" aria-label="Application summary">
        <article className="summary-card">
          <div className="summary-card-top">
            <p className="summary-label">Total Applications</p>
            <span className="summary-icon" aria-hidden="true">
              <BriefcaseIcon />
            </span>
          </div>
          <p className="summary-value">{stats.total_applications}</p>
          <p className="summary-hint">All tracked applications</p>
        </article>
        <article className="summary-card">
          <div className="summary-card-top">
            <p className="summary-label">This Week</p>
            <span className="summary-icon" aria-hidden="true">
              <ClockIcon />
            </span>
          </div>
          <p className="summary-value">{stats.applications_this_week}</p>
          <p className="summary-hint">Added in the last 7 days</p>
        </article>
        <article className="summary-card">
          <div className="summary-card-top">
            <p className="summary-label">This Month</p>
            <span className="summary-icon" aria-hidden="true">
              <CalendarIcon />
            </span>
          </div>
          <p className="summary-value">{stats.applications_this_month}</p>
          <p className="summary-hint">Added this calendar month</p>
        </article>
      </section>

      {isEmpty ? (
        <div className="dashboard-empty-cta">
          <p className="dashboard-empty-cta-title">
            Start tracking your job search
          </p>
          <p className="dashboard-empty-cta-copy">
            Add your first application to see your pipeline and deadlines here.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateOpen(true)}
          >
            Add your first application
          </button>
        </div>
      ) : null}

      <div className="dashboard-grid">
        <section
          className="dashboard-panel dashboard-panel-pipeline"
          aria-labelledby="status-heading"
        >
          <div className="panel-header">
            <h2 id="status-heading">Application Pipeline</h2>
            <p className="panel-subtitle">
              Where every application currently stands.
            </p>
          </div>
          <ul className="status-list">
            {STATUS_ORDER.map((status) => {
              const count = stats.by_status[status]
              return (
                <li key={status} className="status-row">
                  <div className="status-row-top">
                    <span className="status-name">
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="status-count">{count}</span>
                  </div>
                  <div
                    className="status-bar-track"
                    aria-hidden="true"
                  >
                    <div
                      className="status-bar-fill"
                      data-status={status}
                      style={{ width: statusBarWidth(count, total) }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section
          className="dashboard-panel dashboard-panel-deadlines"
          aria-labelledby="upcoming-heading"
        >
          <div className="panel-header">
            <h2 id="upcoming-heading">Upcoming Deadlines</h2>
            <p className="panel-subtitle">
              The next deadlines that need your attention.
            </p>
          </div>

          {upcoming.length === 0 ? (
            <div className="dashboard-empty">
              <span className="dashboard-empty-icon" aria-hidden="true">
                <CheckCalendarIcon />
              </span>
              <p className="dashboard-empty-title">No upcoming deadlines</p>
              <p className="dashboard-empty-copy">
                You&apos;re all caught up. New deadlines will appear here.
              </p>
            </div>
          ) : (
            <ul className="deadline-list">
              {upcoming.map((item) => (
                <li
                  key={item.id}
                  className={`deadline-item ${urgencyClass(item.days_remaining)}`}
                >
                  <div className="deadline-main">
                    <Link
                      to={`/applications/${item.id}`}
                      className="deadline-link"
                    >
                      <p className="upcoming-company">{item.company}</p>
                      <p className="upcoming-position">{item.position}</p>
                    </Link>
                    <div className="deadline-meta">
                      <span className="upcoming-deadline">
                        <CalendarIcon />
                        <span>{formatDeadline(item.deadline)}</span>
                      </span>
                      <span className="upcoming-remaining">
                        {formatDaysRemaining(item.days_remaining)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
