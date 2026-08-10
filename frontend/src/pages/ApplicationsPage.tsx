import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'

import { CreateApplicationModal } from '../components/CreateApplicationModal'
import { StatusBadge } from '../components/StatusBadge'
import { getApplications } from '../services/applications'
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_ORDER,
  type ApplicationListResponse,
  type ApplicationSortBy,
  type ApplicationSortOrder,
  type ApplicationStatus,
} from '../types/application'
import { formatDate } from '../utils/datetime'

const PAGE_SIZE = 20
const DEBOUNCE_MS = 350

const SORT_LABELS: Record<ApplicationSortBy, string> = {
  created_at: 'Newest',
  deadline: 'Deadline',
  company: 'Company',
  position: 'Position',
  status: 'Status',
}

type DeadlineDisplay = {
  label: string
  urgency: 'none' | 'today' | 'soon' | 'normal'
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDeadlineDisplay(value: string | null): DeadlineDisplay {
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
    return { label: 'Today', urgency: 'today' }
  }
  if (days === 1) {
    return { label: 'Tomorrow', urgency: 'soon' }
  }
  if (days > 1 && days <= 3) {
    return { label: `${days} days`, urgency: 'soon' }
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

function ApplicationsSkeleton() {
  return (
    <div
      className="applications-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="visually-hidden">Loading applications…</span>
      <div className="applications-skeleton-toolbar" />
      <div className="applications-skeleton-table">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="applications-skeleton-row" />
        ))}
      </div>
    </div>
  )
}

export function ApplicationsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [debouncedLocation, setDebouncedLocation] = useState('')
  const [status, setStatus] = useState<ApplicationStatus | ''>('')
  const [sortBy, setSortBy] = useState<ApplicationSortBy>('created_at')
  const [sortOrder, setSortOrder] = useState<ApplicationSortOrder>('desc')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ApplicationListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedLocation(locationInput.trim())
      setPage(1)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [locationInput])

  useEffect(() => {
    let cancelled = false

    async function loadApplications() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await getApplications({
          search: debouncedSearch || undefined,
          status: status || undefined,
          location: debouncedLocation || undefined,
          page,
          page_size: PAGE_SIZE,
          sort_by: sortBy,
          sort_order: sortOrder,
        })

        if (!cancelled) {
          setData(response)
        }
      } catch {
        if (!cancelled) {
          setData(null)
          setError('Unable to load applications. Please try again.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadApplications()

    return () => {
      cancelled = true
    }
  }, [
    debouncedSearch,
    debouncedLocation,
    status,
    sortBy,
    sortOrder,
    page,
    reloadKey,
  ])

  const hasActiveFilters = Boolean(
    debouncedSearch || status || debouncedLocation,
  )

  function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value
    setStatus(value === '' ? '' : (value as ApplicationStatus))
    setPage(1)
  }

  function handleSortByChange(event: ChangeEvent<HTMLSelectElement>) {
    setSortBy(event.target.value as ApplicationSortBy)
    setPage(1)
  }

  function handleSortOrderChange(event: ChangeEvent<HTMLSelectElement>) {
    setSortOrder(event.target.value as ApplicationSortOrder)
    setPage(1)
  }

  function handleClearFilters() {
    setIsLoading(true)
    setSearchInput('')
    setDebouncedSearch('')
    setLocationInput('')
    setDebouncedLocation('')
    setStatus('')
    setPage(1)
  }

  function handleRetry() {
    setReloadKey((key) => key + 1)
  }

  function handleCreated() {
    setPage(1)
    setReloadKey((key) => key + 1)
  }

  const totalPages = data?.pages ?? 0
  const currentPage = data?.page ?? page
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const canGoPrevious = !isLoading && currentPage > 1
  const canGoNext = !isLoading && totalPages > 0 && currentPage < totalPages
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total)

  return (
    <div className="applications-page">
      <header className="applications-header">
        <div className="applications-header-row">
          <div className="applications-header-copy">
            <p className="applications-eyebrow">Applications</p>
            <h1>Your applications</h1>
            <p className="applications-lead">
              Track every opportunity, keep deadlines visible, and stay
              organized throughout your job search.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary applications-add"
            onClick={() => setIsCreateOpen(true)}
          >
            + Add Application
          </button>
        </div>
      </header>

      <CreateApplicationModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      {!isLoading && !error ? (
        <div className="applications-summary" aria-live="polite">
          {total === 0 ? (
            <span>No applications yet</span>
          ) : (
            <>
              <span>
                {total} {total === 1 ? 'application' : 'applications'}
              </span>
              {totalPages > 0 ? (
                <span>
                  Page {currentPage} of {totalPages}
                </span>
              ) : null}
              <span>
                Showing {rangeStart}–{rangeEnd}
              </span>
            </>
          )}
          <span className="applications-summary-sort">
            Sorted by {SORT_LABELS[sortBy]} (
            {sortOrder === 'desc' ? 'descending' : 'ascending'})
          </span>
        </div>
      ) : null}

      <section className="applications-toolbar" aria-label="Search and filters">
        <div className="applications-toolbar-grid">
          <label className="applications-field applications-search">
            <span className="field-label">Search</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search company or position..."
              autoComplete="off"
            />
          </label>

          <label className="applications-field">
            <span className="field-label">Status</span>
            <select value={status} onChange={handleStatusChange}>
              <option value="">All statuses</option>
              {APPLICATION_STATUS_ORDER.map((value) => (
                <option key={value} value={value}>
                  {APPLICATION_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="applications-field">
            <span className="field-label">Location</span>
            <input
              type="text"
              value={locationInput}
              onChange={(event) => setLocationInput(event.target.value)}
              placeholder="Filter by location..."
              autoComplete="off"
            />
          </label>

          <label className="applications-field">
            <span className="field-label">Sort by</span>
            <select value={sortBy} onChange={handleSortByChange}>
              <option value="created_at">Newest</option>
              <option value="deadline">Deadline</option>
              <option value="company">Company</option>
              <option value="position">Position</option>
              <option value="status">Status</option>
            </select>
          </label>

          <label className="applications-field">
            <span className="field-label">Order</span>
            <select value={sortOrder} onChange={handleSortOrderChange}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          {hasActiveFilters ? (
            <div className="applications-toolbar-actions">
              <button
                type="button"
                className="btn btn-secondary applications-clear-filters"
                onClick={handleClearFilters}
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {isLoading ? <ApplicationsSkeleton /> : null}

      {!isLoading && error ? (
        <div
          className="applications-state applications-state-error"
          role="alert"
        >
          <p className="applications-empty-title">
            Couldn&apos;t load your applications
          </p>
          <p className="applications-empty-copy">{error}</p>
          <button
            type="button"
            className="btn btn-primary applications-retry"
            onClick={handleRetry}
          >
            Try again
          </button>
        </div>
      ) : null}

      {!isLoading && !error && total === 0 && !hasActiveFilters ? (
        <div className="applications-state applications-empty">
          <p className="applications-empty-title">
            Your job search starts here
          </p>
          <p className="applications-empty-copy">
            Add your first application to start tracking opportunities.
          </p>
          <button
            type="button"
            className="btn btn-primary applications-empty-action"
            onClick={() => setIsCreateOpen(true)}
          >
            + Add Application
          </button>
        </div>
      ) : null}

      {!isLoading && !error && total === 0 && hasActiveFilters ? (
        <div className="applications-state applications-empty">
          <p className="applications-empty-title">No applications found</p>
          <p className="applications-empty-copy">
            Try adjusting your search or filters.
          </p>
          <button
            type="button"
            className="btn btn-secondary applications-empty-action"
            onClick={handleClearFilters}
          >
            Clear filters
          </button>
        </div>
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <>
          <div className="applications-table-wrap">
            <table className="applications-table">
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  <th scope="col">Position</th>
                  <th scope="col">Location</th>
                  <th scope="col">Status</th>
                  <th scope="col">Deadline</th>
                  <th scope="col">Applied</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((application) => {
                  const deadline = formatDeadlineDisplay(application.deadline)
                  return (
                    <tr key={application.id} className="applications-table-row">
                      <td>
                        <Link
                          to={`/applications/${application.id}`}
                          className="app-company-link"
                        >
                          {application.company}
                        </Link>
                      </td>
                      <td>
                        <span className="app-position-cell">
                          {application.position}
                        </span>
                      </td>
                      <td className="app-muted-cell">
                        {application.location || '—'}
                      </td>
                      <td>
                        <StatusBadge status={application.status} />
                      </td>
                      <td>
                        <span
                          className={`deadline-cell deadline-${deadline.urgency}`}
                        >
                          {deadline.label}
                        </span>
                      </td>
                      <td className="app-muted-cell">
                        {formatDate(application.applied_at)}
                      </td>
                      <td className="app-actions-cell">
                        <Link
                          to={`/applications/${application.id}`}
                          className="app-view-link"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="applications-card-list">
            {items.map((application) => {
              const deadline = formatDeadlineDisplay(application.deadline)
              return (
                <li key={application.id} className="application-card">
                  <Link
                    to={`/applications/${application.id}`}
                    className="application-card-link"
                  >
                    <div className="application-card-top">
                      <div className="application-card-identity">
                        <span className="app-company">
                          {application.company}
                        </span>
                        <span className="app-position">
                          {application.position}
                        </span>
                      </div>
                      <StatusBadge status={application.status} />
                    </div>

                    <dl className="application-card-details">
                      <div>
                        <dt>Location</dt>
                        <dd>{application.location || '—'}</dd>
                      </div>
                      <div>
                        <dt>Deadline</dt>
                        <dd
                          className={`deadline-cell deadline-${deadline.urgency}`}
                        >
                          {deadline.label}
                        </dd>
                      </div>
                      <div>
                        <dt>Applied</dt>
                        <dd>{formatDate(application.applied_at)}</dd>
                      </div>
                    </dl>

                    <span className="application-card-view">View details</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          {totalPages > 1 ? (
            <nav className="applications-pagination" aria-label="Pagination">
              <button
                type="button"
                className="pagination-button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!canGoPrevious}
              >
                Previous
              </button>
              <p className="pagination-status" aria-live="polite">
                Page {currentPage} of {totalPages}
              </p>
              <button
                type="button"
                className="pagination-button"
                onClick={() =>
                  setPage((current) =>
                    totalPages === 0
                      ? current
                      : Math.min(totalPages, current + 1),
                  )
                }
                disabled={!canGoNext}
              >
                Next
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
