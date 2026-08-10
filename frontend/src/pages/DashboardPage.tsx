import { useEffect, useState } from 'react'

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
  if (days === 0) {
    return 'Today'
  }
  if (days === 1) {
    return '1 day remaining'
  }
  return `${days} days remaining`
}

function formatDeadline(deadline: string): string {
  const date = new Date(deadline)
  if (Number.isNaN(date.getTime())) {
    return deadline
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function urgencyClass(daysRemaining: number): string {
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

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [upcoming, setUpcoming] = useState<UpcomingDeadline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

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

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
          <p className="dashboard-lead">
            Track your applications and stay ahead of your deadlines.
          </p>
        </header>
        <div className="dashboard-state" role="status">
          <p className="dashboard-loading">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
          <p className="dashboard-lead">
            Track your applications and stay ahead of your deadlines.
          </p>
        </header>
        <div className="dashboard-state dashboard-state-error" role="alert">
          <p className="dashboard-error">
            {error ?? 'Unable to load dashboard. Please try again.'}
          </p>
          <button
            type="button"
            className="dashboard-retry"
            onClick={handleRetry}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const total = stats.total_applications

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-lead">
          Track your applications and stay ahead of your deadlines.
        </p>
      </header>

      <section
        className="dashboard-summary"
        aria-label="Application summary"
      >
        <article className="summary-card">
          <div className="summary-card-mark" aria-hidden="true" />
          <p className="summary-label">Total Applications</p>
          <p className="summary-value">{stats.total_applications}</p>
        </article>
        <article className="summary-card">
          <div className="summary-card-mark" aria-hidden="true" />
          <p className="summary-label">This Week</p>
          <p className="summary-value">{stats.applications_this_week}</p>
        </article>
        <article className="summary-card">
          <div className="summary-card-mark" aria-hidden="true" />
          <p className="summary-label">This Month</p>
          <p className="summary-value">{stats.applications_this_month}</p>
        </article>
      </section>

      <div className="dashboard-grid">
        <section
          className="dashboard-panel"
          aria-labelledby="status-heading"
        >
          <div className="panel-header">
            <h2 id="status-heading">Application Status</h2>
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
                      style={{ width: statusBarWidth(count, total) }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section
          className="dashboard-panel"
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
              <p className="dashboard-empty-title">
                No upcoming deadlines.
              </p>
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
                    <p className="upcoming-company">{item.company}</p>
                    <p className="upcoming-position">{item.position}</p>
                    <p className="upcoming-deadline">
                      {formatDeadline(item.deadline)}
                    </p>
                  </div>
                  <p className="upcoming-remaining">
                    {formatDaysRemaining(item.days_remaining)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
