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

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [upcoming, setUpcoming] = useState<UpcomingDeadline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  }, [])

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <h1>Dashboard</h1>
        <p className="dashboard-loading" role="status">
          Loading dashboard...
        </p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="dashboard-page">
        <h1>Dashboard</h1>
        <p className="dashboard-error" role="alert">
          {error ?? 'Unable to load dashboard. Please try again.'}
        </p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>

      <section className="dashboard-section" aria-labelledby="overview-heading">
        <h2 id="overview-heading">Overview</h2>
        <dl className="dashboard-metrics">
          <div>
            <dt>Total applications</dt>
            <dd>{stats.total_applications}</dd>
          </div>
          <div>
            <dt>Applications this week</dt>
            <dd>{stats.applications_this_week}</dd>
          </div>
          <div>
            <dt>Applications this month</dt>
            <dd>{stats.applications_this_month}</dd>
          </div>
        </dl>
      </section>

      <section className="dashboard-section" aria-labelledby="status-heading">
        <h2 id="status-heading">By status</h2>
        <dl className="dashboard-status-list">
          {STATUS_ORDER.map((status) => (
            <div key={status}>
              <dt>{status}</dt>
              <dd>{stats.by_status[status]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        className="dashboard-section"
        aria-labelledby="upcoming-heading"
      >
        <h2 id="upcoming-heading">Upcoming deadlines</h2>
        {upcoming.length === 0 ? (
          <p className="dashboard-empty">No upcoming deadlines.</p>
        ) : (
          <ul className="dashboard-upcoming-list">
            {upcoming.map((item) => (
              <li key={item.id}>
                <p className="upcoming-company">{item.company}</p>
                <p className="upcoming-position">{item.position}</p>
                <p className="upcoming-deadline">
                  Deadline: {formatDeadline(item.deadline)}
                </p>
                <p className="upcoming-remaining">
                  {formatDaysRemaining(item.days_remaining)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
