export type EligibilityStatus = 'UNKNOWN' | 'YES' | 'NO'

export const ELIGIBILITY_STATUS_ORDER: EligibilityStatus[] = [
  'UNKNOWN',
  'YES',
  'NO',
]

export const ELIGIBILITY_STATUS_LABELS: Record<EligibilityStatus, string> = {
  UNKNOWN: 'Unknown',
  YES: 'Yes',
  NO: 'No',
}

/** User-facing remote label (does not overstate eligibility). */
export function formatRemoteStatus(status: EligibilityStatus): string {
  if (status === 'YES') {
    return 'Remote'
  }
  if (status === 'NO') {
    return 'Not remote'
  }
  return 'Remote · Unknown'
}

/** User-facing international eligibility label. */
export function formatInternationalEligibility(status: EligibilityStatus): string {
  if (status === 'YES') {
    return 'Worldwide'
  }
  if (status === 'NO') {
    return 'Country restricted'
  }
  return 'Eligibility unknown'
}

/** User-facing visa sponsorship label. */
export function formatVisaStatus(status: EligibilityStatus): string {
  if (status === 'YES') {
    return 'Visa sponsorship'
  }
  if (status === 'NO') {
    return 'No sponsorship'
  }
  return 'Visa · Unknown'
}

export function formatSourceLabel(source: string): string {
  if (source === 'himalayas') {
    return 'Himalayas'
  }
  return source
}

export function sourceLinkLabel(source: string): string {
  if (source === 'himalayas') {
    return 'View on Himalayas'
  }
  return 'View source'
}

export type DiscoveredJob = {
  id: number
  title: string
  company: string
  location: string | null
  description: string | null
  employment_type: string | null
  source: string
  source_url: string | null
  remote_status: EligibilityStatus
  visa_sponsorship_status: EligibilityStatus
  relocation_status: EligibilityStatus
  international_eligibility_status: EligibilityStatus
  discovered_at: string
  salary: string | null
  experience_level: string | null
  skills: string | null
  created_at: string
  updated_at: string
}

export type DiscoveredJobListResponse = {
  items: DiscoveredJob[]
  page: number
  page_size: number
  total: number
  pages: number
}

export type DiscoveredJobSortBy = 'discovered_at' | 'company' | 'title'
export type DiscoveredJobSortOrder = 'asc' | 'desc'

export type DiscoveredJobListParams = {
  search?: string
  location?: string
  remote_status?: EligibilityStatus
  visa_sponsorship_status?: EligibilityStatus
  employment_type?: string
  page?: number
  page_size?: number
  sort_by?: DiscoveredJobSortBy
  sort_order?: DiscoveredJobSortOrder
}
