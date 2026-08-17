import { useEffect, useId, useRef, useState } from 'react'

import { ApiError } from '../services/api'
import { deleteApplication } from '../services/applications'

type DeleteApplicationModalProps = {
  open: boolean
  applicationId: number
  company: string
  onClose: () => void
  onDeleted: () => void
}

export function DeleteApplicationModal({
  open,
  applicationId,
  company,
  onClose,
  onDeleted,
}: DeleteApplicationModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const errorId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setIsDeleting(false)
    setError(null)

    const frame = window.requestAnimationFrame(() => {
      cancelRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isDeleting) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isDeleting, onClose])

  if (!open) {
    return null
  }

  function handleClose() {
    if (!isDeleting) {
      onClose()
    }
  }

  async function handleConfirm() {
    if (isDeleting) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      await deleteApplication(applicationId)
      onDeleted()
    } catch (err) {
      if (err instanceof ApiError && err.message) {
        setError(err.message)
      } else {
        setError('Unable to delete application. Please try again.')
      }
      setIsDeleting(false)
    }
  }

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
        className="modal-dialog modal-dialog-compact modal-dialog-danger"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId}
        aria-busy={isDeleting}
      >
        <div className="modal-header">
          <div className="modal-header-copy">
            <h2 id={titleId}>Delete application?</h2>
            <p className="modal-subtitle modal-subtitle-danger">
              This action cannot be undone.
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={handleClose}
            disabled={isDeleting}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <div className="modal-form">
          <p id={descriptionId} className="delete-confirm-copy">
            You are about to permanently delete{' '}
            <strong>{company}</strong> from your tracker.
          </p>

          {error ? (
            <p id={errorId} className="modal-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="modal-actions">
            <button
              ref={cancelRef}
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                void handleConfirm()
              }}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete application'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
