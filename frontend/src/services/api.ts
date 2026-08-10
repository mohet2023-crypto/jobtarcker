import { getToken } from './tokenStorage'

function getBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    throw new Error('VITE_API_BASE_URL is not configured')
  }
  return baseUrl.replace(/\/$/, '')
}

export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(message: string, status: number, details: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

type RequestOptions = {
  method?: string
  body?: BodyInit | null
  headers?: HeadersInit
  /** When false, skip attaching a bearer token even if one exists. */
  auth?: boolean
}

async function parseError(response: Response): Promise<ApiError> {
  let details: unknown = null
  let message = `Request failed with status ${response.status}`

  try {
    details = await response.json()
    if (
      details &&
      typeof details === 'object' &&
      'detail' in details &&
      typeof (details as { detail: unknown }).detail === 'string'
    ) {
      message = (details as { detail: string }).detail
    }
  } catch {
    try {
      const text = await response.text()
      if (text) {
        details = text
        message = text
      }
    } catch {
      // Keep the status-based message.
    }
  }

  return new ApiError(message, response.status, details)
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  const token = getToken()

  if (options.auth !== false && token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ?? null,
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function apiJson<T>(
  path: string,
  options: {
    method?: string
    body?: unknown
    auth?: boolean
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  return apiRequest<T>(path, {
    method: options.method ?? 'GET',
    headers,
    body:
      options.body === undefined ? null : JSON.stringify(options.body),
    auth: options.auth,
  })
}
