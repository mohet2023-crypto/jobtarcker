import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../services/api'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate(): string | null {
    if (!fullName.trim()) {
      return 'Full name is required.'
    }
    if (!email.trim()) {
      return 'Email is required.'
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      return 'Please enter a valid email address.'
    }
    if (!password) {
      return 'Password is required.'
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters.'
    }
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      })
      navigate('/login', {
        replace: true,
        state: {
          message: 'Account created successfully. Please sign in.',
        },
      })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Register</h1>
        <p className="auth-subtitle">Create an account to track your applications.</p>

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <label className="auth-field" htmlFor="register-full-name">
          <span>Full name</span>
          <input
            id="register-full-name"
            name="full_name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            disabled={isSubmitting}
          />
        </label>

        <label className="auth-field" htmlFor="register-email">
          <span>Email</span>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isSubmitting}
          />
        </label>

        <label className="auth-field" htmlFor="register-password">
          <span>Password</span>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            disabled={isSubmitting}
          />
        </label>

        <button
          className="auth-submit"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  )
}
