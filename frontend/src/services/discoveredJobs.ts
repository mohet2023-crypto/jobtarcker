import { apiJson } from './api'
import type {
  DiscoveredJob,
  DiscoveredJobListParams,
  DiscoveredJobListResponse,
} from '../types/discoveredJob'

export async function getDiscoveredJobs(
  params: DiscoveredJobListParams = {},
): Promise<DiscoveredJobListResponse> {
  const query = new URLSearchParams()

  if (params.search) {
    query.set('search', params.search)
  }
  if (params.location) {
    query.set('location', params.location)
  }
  if (params.remote_status) {
    query.set('remote_status', params.remote_status)
  }
  if (params.visa_sponsorship_status) {
    query.set('visa_sponsorship_status', params.visa_sponsorship_status)
  }
  if (params.employment_type) {
    query.set('employment_type', params.employment_type)
  }
  if (params.page !== undefined) {
    query.set('page', String(params.page))
  }
  if (params.page_size !== undefined) {
    query.set('page_size', String(params.page_size))
  }
  if (params.sort_by) {
    query.set('sort_by', params.sort_by)
  }
  if (params.sort_order) {
    query.set('sort_order', params.sort_order)
  }

  const suffix = query.toString()
  const path = suffix
    ? `/api/v1/discovered-jobs?${suffix}`
    : '/api/v1/discovered-jobs'

  return apiJson<DiscoveredJobListResponse>(path)
}

export async function getDiscoveredJob(jobId: number): Promise<DiscoveredJob> {
  return apiJson<DiscoveredJob>(`/api/v1/discovered-jobs/${jobId}`)
}
