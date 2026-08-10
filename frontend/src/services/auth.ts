import { apiJson, apiRequest } from './api'
import type {
  RegisterRequest,
  TokenResponse,
  UserResponse,
} from '../types/auth'

export async function registerUser(
  data: RegisterRequest,
): Promise<UserResponse> {
  return apiJson<UserResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: data,
    auth: false,
  })
}

export async function loginUser(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams()
  body.set('username', email)
  body.set('password', password)

  return apiRequest<TokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
    auth: false,
  })
}

export async function getCurrentUser(): Promise<UserResponse> {
  return apiJson<UserResponse>('/api/v1/auth/me')
}
