import { useEffect, useState, type ChangeEvent } from 'react'

import { getDiscoveredJobs } from '../services/discoveredJobs'
import {
  ELIGIBILITY_STATUS_LABELS,
  ELIGIBILITY_STATUS_ORDER,
  type DiscoveredJobListResponse,
  type DiscoveredJobSortBy,
  type DiscoveredJobSortOrder,
  type EligibilityStatus,
} from '../types/discoveredJob'
import { formatDate } from '../utils/datetime'

const PAGE_SIZE = 20
const DEBOUNCE_MS = 350

const SORT_LABELS: Record<DiscoveredJobSortBy, string> = {
  discovered_at: 'Date discovered',
  company: 'Company',
  title: 'Title',
}

function eligibilityLabel(value: EligibilityStatus): string {
  return ELIGIBILITY_STATUS_LABELS[value]
}

function GlobalJobsSkeleton() {
  return (
    <div
      className="global-jobs-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="visually-hidden">Loading global jobs…</span>
      <div className="global-jobs-skeleton-toolbar" />
      <div className="global-jobs-skeleton-list">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="global-jobs-skeleton-row" />
        ))}
      </div>
    </div>
  )
}

export function GlobalJobsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [debouncedLocation, setDebouncedLocation] = useState('')
  const [remoteStatus, setRemoteStatus] = useState<EligibilityStatus | ''>('')
  const [visaStatus, setVisaStatus] = useState<EligibilityStatus | ''>('')
  const [sortBy, setSortBy] = useState<DiscoveredJobSortBy>('discovered_at')
  const [sortOrder, setSortOrder] =
    useState<DiscoveredJobSortOrder>('desc')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<DiscoveredJobListResponse | null>(null)
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

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await getDiscoveredJobs({
          search: debouncedSearch || undefined,
          location: debouncedLocation || undefined,
          remote_status: remoteStatus || undefined,
          visa_sponsorship_status: visaStatus || undefined,
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
          setError('Unable to load global jobs. Please try again.')
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
  }, [
    debouncedSearch,
    debouncedLocation,
    remoteStatus,
    visaStatus,
    page,
    sortBy,
    sortOrder,
    reloadKey,
  ])

  function handleRetry() {
    setReloadKey((key) => key + 1)
  }

  function handleClearFilters() {
    setSearchInput('')
    setLocationInput('')
    setRemoteStatus('')
    setVisaStatus('')
    setPage(1)
  }

  const total = data?.total ?? 0
  const items = data?.items ?? []
  const totalPages = data?.pages ?? 0
  const currentPage = data?.page ?? page
  const canGoPrevious = !isLoading && currentPage > 1
  const canGoNext = !isLoading && totalPages > 0 && currentPage < totalPages
  const hasActiveFilters =
    debouncedSearch.length > 0 ||
    debouncedLocation.length > 0 ||
    remoteStatus !== '' ||
    visaStatus !== ''

  return (
    <div className="global-jobs-page">
      <header className="global-jobs-header">
        <div className="global-jobs-header-copy">
          <p className="global-jobs-eyebrow">Global Jobs</p>
          <h1>Find jobs you can apply for worldwide</h1>
          <p className="global-jobs-lead">
            Discover remote, relocation-friendly, and visa-aware opportunities
            as we expand Deadline Dash beyond your personal application tracker.
          </p>
        </div>
      </header>

      <section className="global-jobs-toolbar" aria-label="Search and filters">
        <div className="global-jobs-toolbar-grid">
          <label className="global-jobs-field global-jobs-search">
            <span className="field-label">Search</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setSearchInput(event.target.value)
              }
              placeholder="Search company or title…"
              disabled={isLoading}
            />
          </label>

          <label className="global-jobs-field">
            <span className="field-label">Location</span>
            <input
              type="text"
              value={locationInput}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setLocationInput(event.target.value)
              }
              placeholder="Filter by location…"
              disabled={isLoading}
            />
          </label>

          <label className="global-jobs-field">
            <span className="field-label">Remote</span>
            <select
              value={remoteStatus}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setRemoteStatus(event.target.value as EligibilityStatus | '')
                setPage(1)
              }}
              disabled={isLoading}
            >
              <option value="">Any</option>
              {ELIGIBILITY_STATUS_ORDER.map((value) => (
                <option key={value} value={value}>
                  {ELIGIBILITY_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="global-jobs-field">
            <span className="field-label">Visa sponsorship</span>
            <select
              value={visaStatus}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setVisaStatus(event.target.value as EligibilityStatus | '')
                setPage(1)
              }}
              disabled={isLoading}
            >
              <option value="">Any</option>
              {ELIGIBILITY_STATUS_ORDER.map((value) => (
                <option key={value} value={value}>
                  {ELIGIBILITY_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="global-jobs-field">
            <span className="field-label">Sort by</span>
            <select
              value={sortBy}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setSortBy(event.target.value as DiscoveredJobSortBy)
                setPage(1)
              }}
              disabled={isLoading}
            >
              {(Object.keys(SORT_LABELS) as DiscoveredJobSortBy[]).map(
                (value) => (
                  <option key={value} value={value}>
                    {SORT_LABELS[value]}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="global-jobs-field">
            <span className="field-label">Order</span>
            <select
              value={sortOrder}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setSortOrder(event.target.value as DiscoveredJobSortOrder)
                setPage(1)
              }}
              disabled={isLoading}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>
      </section>

      {isLoading ? <GlobalJobsSkeleton /> : null}

      {!isLoading && error ? (
        <div
          className="global-jobs-state global-jobs-state-error"
          role="alert"
        >
          <p className="global-jobs-empty-title">Something went wrong</p>
          <p className="global-jobs-empty-copy">{error}</p>
          <button
            type="button"
            className="btn btn-secondary global-jobs-empty-action"
            onClick={handleRetry}
          >
            Try again
          </button>
        </div>
      ) : null}

      {!isLoading && !error && total === 0 ? (
        <div className="global-jobs-state global-jobs-empty">
          <p className="global-jobs-empty-title">
            {hasActiveFilters
              ? 'No jobs match your filters'
              : 'Global job discovery is being prepared'}
          </p>
          <p className="global-jobs-empty-copy">
            {hasActiveFilters
              ? 'Try broadening your search or clearing filters. New job sources will appear here once ingestion is enabled.'
              : 'We are building the foundation to surface international, remote, and relocation-friendly roles. Your application tracker continues to work as usual in the meantime.'}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              className="btn btn-secondary global-jobs-empty-action"
              onClick={handleClearFilters}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !error && total > 0 ? (
        <>
          <div className="global-jobs-summary" aria-live="polite">
            <span>
              {total} {total === 1 ? 'job' : 'jobs'}
            </span>
            {totalPages > 0 ? (
              <span>
                Page {currentPage} of {totalPages}
              </span>
            ) : null}
          </div>

          <ul className="global-jobs-list">
            {items.map((job) => (
              <li key={job.id} className="global-jobs-card">
                <div className="global-jobs-card-main">
                  <h2 className="global-jobs-card-title">{job.title}</h2>
                  <p className="global-jobs-card-company">{job.company}</p>
                  <p className="global-jobs-card-meta">
                    {job.location ?? 'Location not specified'}
                    {job.employment_type ? ` · ${job.employment_type}` : ''}
                  </p>
                </div>
                <dl className="global-jobs-card-eligibility">
                  <div>
                    <dt>Remote</dt>
                    <dd>{eligibilityLabel(job.remote_status)}</dd>
                  </div>
                  <div>
                    <dt>Visa</dt>
                    <dd>{eligibilityLabel(job.visa_sponsorship_status)}</dd>
                  </div>
                  <div>
                    <dt>International</dt>
                    <dd>
                      {eligibilityLabel(job.international_eligibility_status)}
                    </dd>
                  </div>
                  <div>
                    <dt>Discovered</dt>
                    <dd>{formatDate(job.discovered_at)}</dd>
                  </div>
                </dl>
                {job.source_url ? (
                  <a
                    className="global-jobs-card-link"
                    href={job.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View source
                  </a>
                ) : null}
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <nav
              className="global-jobs-pagination"
              aria-label="Global jobs pagination"
            >
              <button
                type="button"
                className="pagination-button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!canGoPrevious}
              >
                Previous
              </button>
              <button
                type="button"
                className="pagination-button"
                onClick={() =>
                  setPage((current) =>
                    totalPages ? Math.min(totalPages, current + 1) : current,
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
