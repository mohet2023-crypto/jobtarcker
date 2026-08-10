export type ApplicationStatus =
  | 'SAVED'
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN'

export type StatusCounts = {
  SAVED: number
  APPLIED: number
  SCREENING: number
  INTERVIEW: number
  OFFER: number
  REJECTED: number
  WITHDRAWN: number
}

export type DashboardStats = {
  total_applications: number
  by_status: StatusCounts
  applications_this_week: number
  applications_this_month: number
}

export type UpcomingDeadline = {
  id: number
  company: string
  position: string
  deadline: string
  days_remaining: number
}

export type UpcomingDeadlinesResponse = {
  items: UpcomingDeadline[]
}
