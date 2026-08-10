import { apiJson } from './api'
import type {
  DashboardStats,
  UpcomingDeadlinesResponse,
} from '../types/dashboard'

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiJson<DashboardStats>('/dashboard')
}

export async function getUpcomingDeadlines(
  limit = 10,
): Promise<UpcomingDeadlinesResponse> {
  const params = new URLSearchParams({ limit: String(limit) })
  return apiJson<UpcomingDeadlinesResponse>(
    `/dashboard/upcoming?${params.toString()}`,
  )
}
