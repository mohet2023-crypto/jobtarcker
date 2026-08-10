import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'

import { getApplications } from '../services/applications'
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_ORDER,
  type Application,
  type ApplicationListResponse,
  type ApplicationSortBy,
  type ApplicationSortOrder,
  type ApplicationStatus,
} from '../types/application'

const PAGE_SIZE = 20
const DEBOUNCE_MS = 350

function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString(undefined, {
    dateStyle: 'medium',
  })
}

function statusClassName(status: ApplicationStatus): string {
  return `status-badge status-${status.toLowerCase()}`
}

function ApplicationIdentity({ application }: { application: Application }) {
  return (
    <Link
      to={`/applications/${application.id}`}
      className="app-identity-link"
    >
      <span className="app-company">{application.company}</span>
      <span className="app-position">{application.position}</span>
    </Link>
  )
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={statusClassName(status)}>
      {APPLICATION_STATUS_LABELS[status]}
    </span>
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

  function handleRetry() {
    setReloadKey((key) => key + 1)
  }

  const totalPages = data?.pages ?? 0
  const currentPage = data?.page ?? page
  const items = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <div className="applications-page">
      <header className="applications-header">
        <h1>Applications</h1>
        <p className="applications-lead">
          Track and manage your job applications.
        </p>
      </header>

      <section className="applications-toolbar" aria-label="Filters">
        <label className="applications-field applications-search">
          <span className="visually-hidden">Search applications</span>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search company or position..."
          />
        </label>

        <div className="applications-filters">
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
        </div>
      </section>

      {isLoading ? (
        <div className="applications-state" role="status">
          <p>Loading applications...</p>
        </div>
      ) : null}

      {!isLoading && error ? (
        <div
          className="applications-state applications-state-error"
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            className="applications-retry"
            onClick={handleRetry}
          >
            Try again
          </button>
        </div>
      ) : null}

      {!isLoading && !error && total === 0 && !hasActiveFilters ? (
        <div className="applications-state applications-empty">
          <p className="applications-empty-title">No applications yet.</p>
          <p className="applications-empty-copy">
            Start tracking your job applications to keep everything organized.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && total === 0 && hasActiveFilters ? (
        <div className="applications-state applications-empty">
          <p className="applications-empty-title">No applications found.</p>
          <p className="applications-empty-copy">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <>
          <p className="applications-meta">
            Showing {items.length} of {total}{' '}
            {total === 1 ? 'application' : 'applications'}
          </p>

          <div className="applications-table-wrap">
            <table className="applications-table">
              <thead>
                <tr>
                  <th scope="col">Company / Position</th>
                  <th scope="col">Status</th>
                  <th scope="col">Location</th>
                  <th scope="col">Deadline</th>
                  <th scope="col">Applied</th>
                </tr>
              </thead>
              <tbody>
                {items.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <ApplicationIdentity application={application} />
                    </td>
                    <td>
                      <StatusBadge status={application.status} />
                    </td>
                    <td>{application.location || '—'}</td>
                    <td>{formatDate(application.deadline)}</td>
                    <td>{formatDate(application.applied_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="applications-card-list">
            {items.map((application) => (
              <li key={application.id} className="application-card">
                <ApplicationIdentity application={application} />
                <div className="application-card-meta">
                  <StatusBadge status={application.status} />
                  <span>{application.location || 'No location'}</span>
                </div>
                <dl className="application-card-dates">
                  <div>
                    <dt>Deadline</dt>
                    <dd>{formatDate(application.deadline)}</dd>
                  </div>
                  <div>
                    <dt>Applied</dt>
                    <dd>{formatDate(application.applied_at)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <nav className="applications-pagination" aria-label="Pagination">
              <button
                type="button"
                className="pagination-button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </button>
              <p className="pagination-status">
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
                disabled={currentPage >= totalPages}
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
