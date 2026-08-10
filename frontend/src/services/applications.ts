import { apiJson } from './api'
import type {
  Application,
  ApplicationCreateRequest,
  ApplicationListParams,
  ApplicationListResponse,
  ApplicationUpdateRequest,
} from '../types/application'
import type { ApplicationEventsResponse } from '../types/event'

export async function getApplications(
  params: ApplicationListParams = {},
): Promise<ApplicationListResponse> {
  const query = new URLSearchParams()

  if (params.search?.trim()) {
    query.set('search', params.search.trim())
  }
  if (params.status) {
    query.set('status', params.status)
  }
  if (params.location?.trim()) {
    query.set('location', params.location.trim())
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
  return apiJson<ApplicationListResponse>(
    suffix ? `/applications?${suffix}` : '/applications',
  )
}

export async function getApplication(id: number): Promise<Application> {
  return apiJson<Application>(`/applications/${id}`)
}

export async function createApplication(
  data: ApplicationCreateRequest,
): Promise<Application> {
  return apiJson<Application>('/applications', {
    method: 'POST',
    body: data,
  })
}

export async function updateApplication(
  id: number,
  data: ApplicationUpdateRequest,
): Promise<Application> {
  return apiJson<Application>(`/applications/${id}`, {
    method: 'PATCH',
    body: data,
  })
}

export async function getApplicationEvents(
  id: number,
): Promise<ApplicationEventsResponse> {
  return apiJson<ApplicationEventsResponse>(`/applications/${id}/events`)
}
