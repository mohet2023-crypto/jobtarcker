export type RegisterRequest = {
  email: string
  password: string
  full_name: string
}

export type UserResponse = {
  id: number
  email: string
  full_name: string
  created_at: string
}

export type TokenResponse = {
  access_token: string
  token_type: string
}
