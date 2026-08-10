export type ApplicationStatus =
  | 'SAVED'
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN'

export type Application = {
  id: number
  company: string
  position: string
  status: ApplicationStatus
  job_url: string | null
  location: string | null
  salary: string | null
  applied_at: string | null
  deadline: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ApplicationListResponse = {
  items: Application[]
  page: number
  page_size: number
  total: number
  pages: number
}

export type ApplicationSortBy =
  | 'created_at'
  | 'deadline'
  | 'company'
  | 'position'
  | 'status'

export type ApplicationSortOrder = 'asc' | 'desc'

export type ApplicationListParams = {
  search?: string
  status?: ApplicationStatus
  location?: string
  page?: number
  page_size?: number
  sort_by?: ApplicationSortBy
  sort_order?: ApplicationSortOrder
}

export type ApplicationCreateRequest = {
  company: string
  position: string
  job_url?: string | null
  status?: ApplicationStatus
  location?: string | null
  salary?: string | null
  applied_at?: string | null
  deadline?: string | null
  notes?: string | null
}

export type ApplicationUpdateRequest = {
  company?: string
  position?: string
  job_url?: string | null
  status?: ApplicationStatus
  location?: string | null
  salary?: string | null
  applied_at?: string | null
  deadline?: string | null
  notes?: string | null
}

export const APPLICATION_STATUS_ORDER: ApplicationStatus[] = [
  'SAVED',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
}
