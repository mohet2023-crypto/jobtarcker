import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'

import { CreateApplicationModal } from '../components/CreateApplicationModal'
import { StatusBadge } from '../components/StatusBadge'
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

  return (
    <div className="applications-page">
      <header className="applications-header">
        <div className="applications-header-row">
          <div>
            <h1>Applications</h1>
            <p className="applications-lead">
              Track and manage your job applications in one place.
            </p>
          </div>
          <button
            type="button"
            className="applications-add"
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

      <section className="applications-toolbar" aria-label="Search and filters">
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
        </div>

        {hasActiveFilters ? (
          <div className="applications-active-filters">
            <p className="applications-active-label">Active filters</p>
            <ul className="applications-filter-chips">
              {debouncedSearch ? (
                <li className="applications-filter-chip">
                  Search: {debouncedSearch}
                </li>
              ) : null}
              {status ? (
                <li className="applications-filter-chip">
                  Status: {APPLICATION_STATUS_LABELS[status]}
                </li>
              ) : null}
              {debouncedLocation ? (
                <li className="applications-filter-chip">
                  Location: {debouncedLocation}
                </li>
              ) : null}
            </ul>
            <button
              type="button"
              className="applications-clear-filters"
              onClick={handleClearFilters}
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </section>

      {isLoading ? (
        <div
          className="applications-state applications-state-loading"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <p className="applications-empty-title">Loading applications…</p>
          <p className="applications-empty-copy">
            Fetching your latest applications.
          </p>
        </div>
      ) : null}

      {!isLoading && error ? (
        <div
          className="applications-state applications-state-error"
          role="alert"
        >
          <p className="applications-empty-title">Something went wrong</p>
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
          <p className="applications-empty-title">No applications yet</p>
          <p className="applications-empty-copy">
            Add your first application to start tracking deadlines, status, and
            progress.
          </p>
          <button
            type="button"
            className="applications-add applications-empty-action"
            onClick={() => setIsCreateOpen(true)}
          >
            + Add Application
          </button>
        </div>
      ) : null}

      {!isLoading && !error && total === 0 && hasActiveFilters ? (
        <div className="applications-state applications-empty">
          <p className="applications-empty-title">No matching applications</p>
          <p className="applications-empty-copy">
            Nothing matches your current search or filters. Try adjusting them,
            or clear filters to see everything again.
          </p>
          <button
            type="button"
            className="applications-clear-filters applications-empty-action"
            onClick={handleClearFilters}
          >
            Clear filters
          </button>
        </div>
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <>
          <div className="applications-results-header">
            <p className="applications-meta">
              Showing {items.length} of {total}{' '}
              {total === 1 ? 'application' : 'applications'}
              {hasActiveFilters ? ' matching your filters' : ''}
            </p>
            <p className="applications-sort-meta">
              Sorted by {SORT_LABELS[sortBy]} (
              {sortOrder === 'desc' ? 'descending' : 'ascending'})
            </p>
          </div>

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
                  <tr key={application.id} className="applications-table-row">
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
                <Link
                  to={`/applications/${application.id}`}
                  className="application-card-link"
                >
                  <span className="app-company">{application.company}</span>
                  <span className="app-position">{application.position}</span>
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
                </Link>
              </li>
            ))}
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
