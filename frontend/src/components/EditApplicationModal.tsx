import { useEffect, useId, useRef, useState, type FormEvent } from 'react'

import { ApiError } from '../services/api'
import { updateApplication } from '../services/applications'
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_ORDER,
  type Application,
  type ApplicationStatus,
} from '../types/application'
import {
  datetimeLocalToIso,
  emptyToNull,
  isoToDatetimeLocal,
} from '../utils/datetime'

type EditApplicationModalProps = {
  open: boolean
  application: Application
  onClose: () => void
  onUpdated: () => void
}

type FormState = {
  company: string
  position: string
  jobUrl: string
  status: ApplicationStatus
  location: string
  salary: string
  appliedAt: string
  deadline: string
  notes: string
}

function formFromApplication(application: Application): FormState {
  return {
    company: application.company,
    position: application.position,
    jobUrl: application.job_url ?? '',
    status: application.status,
    location: application.location ?? '',
    salary: application.salary ?? '',
    appliedAt: isoToDatetimeLocal(application.applied_at),
    deadline: isoToDatetimeLocal(application.deadline),
    notes: application.notes ?? '',
  }
}

export function EditApplicationModal({
  open,
  application,
  onClose,
  onUpdated,
}: EditApplicationModalProps) {
  const titleId = useId()
  const errorId = useId()
  const companyRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<FormState>(() =>
    formFromApplication(application),
  )
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setForm(formFromApplication(application))
    setValidationError(null)
    setSubmitError(null)
    setIsSubmitting(false)

    const frame = window.requestAnimationFrame(() => {
      companyRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [open, application])

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isSubmitting, onClose])

  if (!open) {
    return null
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleClose() {
    if (!isSubmitting) {
      onClose()
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    setValidationError(null)
    setSubmitError(null)

    const company = form.company.trim()
    const position = form.position.trim()

    if (!company) {
      setValidationError('Company is required.')
      return
    }
    if (!position) {
      setValidationError('Position is required.')
      return
    }

    setIsSubmitting(true)

    try {
      await updateApplication(application.id, {
        company,
        position,
        job_url: emptyToNull(form.jobUrl),
        status: form.status,
        location: emptyToNull(form.location),
        salary: emptyToNull(form.salary),
        applied_at: datetimeLocalToIso(form.appliedAt),
        deadline: datetimeLocalToIso(form.deadline),
        notes: emptyToNull(form.notes),
      })
      onUpdated()
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.message) {
        setSubmitError(err.message)
      } else {
        setSubmitError('Unable to update application. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const formError = validationError ?? submitError

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose()
        }
      }}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={formError ? errorId : undefined}
        aria-busy={isSubmitting}
      >
        <div className="modal-header">
          <h2 id={titleId}>Edit Application</h2>
          <button
            type="button"
            className="modal-close"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit} noValidate>
          {formError ? (
            <p id={errorId} className="modal-error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="modal-grid">
            <label className="applications-field">
              <span className="field-label">Company *</span>
              <input
                ref={companyRef}
                type="text"
                value={form.company}
                onChange={(event) => updateField('company', event.target.value)}
                required
                disabled={isSubmitting}
                autoComplete="organization"
              />
            </label>

            <label className="applications-field">
              <span className="field-label">Position *</span>
              <input
                type="text"
                value={form.position}
                onChange={(event) =>
                  updateField('position', event.target.value)
                }
                required
                disabled={isSubmitting}
              />
            </label>

            <label className="applications-field">
              <span className="field-label">Job URL</span>
              <input
                type="url"
                value={form.jobUrl}
                onChange={(event) => updateField('jobUrl', event.target.value)}
                placeholder="https://"
                disabled={isSubmitting}
              />
            </label>

            <label className="applications-field">
              <span className="field-label">Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  updateField(
                    'status',
                    event.target.value as ApplicationStatus,
                  )
                }
                disabled={isSubmitting}
              >
                {APPLICATION_STATUS_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {APPLICATION_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className="applications-field">
              <span className="field-label">Location</span>
              <input
                type="text"
                value={form.location}
                onChange={(event) =>
                  updateField('location', event.target.value)
                }
                disabled={isSubmitting}
              />
            </label>

            <label className="applications-field">
              <span className="field-label">Salary</span>
              <input
                type="text"
                value={form.salary}
                onChange={(event) => updateField('salary', event.target.value)}
                disabled={isSubmitting}
              />
            </label>

            <label className="applications-field">
              <span className="field-label">Applied Date</span>
              <input
                type="datetime-local"
                value={form.appliedAt}
                onChange={(event) =>
                  updateField('appliedAt', event.target.value)
                }
                disabled={isSubmitting}
              />
            </label>

            <label className="applications-field">
              <span className="field-label">Deadline</span>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(event) =>
                  updateField('deadline', event.target.value)
                }
                disabled={isSubmitting}
              />
            </label>

            <label className="applications-field modal-field-full">
              <span className="field-label">Notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                rows={4}
                disabled={isSubmitting}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="modal-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
