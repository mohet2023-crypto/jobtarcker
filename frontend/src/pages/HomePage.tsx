import { Link } from 'react-router-dom'

import { StatusBadge } from '../components/StatusBadge'

const PREVIEW_APPLICATIONS = [
  {
    company: 'Amazon',
    position: 'Software Engineer',
    status: 'SAVED' as const,
  },
  {
    company: 'Google',
    position: 'Backend Engineer',
    status: 'INTERVIEW' as const,
  },
  {
    company: 'Meta',
    position: 'Software Engineer',
    status: 'APPLIED' as const,
  },
]

function FeatureIcon({ name }: { name: 'track' | 'schedule' | 'progress' }) {
  if (name === 'track') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect
          x="4"
          y="5"
          width="16"
          height="14"
          rx="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M8 10h8M8 14h5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (name === 'schedule') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle
          cx="12"
          cy="13"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 10v3.5l2.2 1.3M9 4.5h6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M5 16V8M10 16V5M15 16v-6M20 16V9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function HomePage() {
  return (
    <div className="landing-page">
      <section className="landing-hero" aria-labelledby="landing-hero-heading">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Job search, organized.</p>
          <h1 id="landing-hero-heading">
            Track every application.
            <br />
            Never miss a deadline.
          </h1>
          <p className="landing-lead">
            Deadline Dash helps you organize job applications, track progress,
            and stay on top of important deadlines — all in one place.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="btn btn-primary">
              Get Started
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Sign In
            </Link>
          </div>
        </div>

        <div className="landing-preview" aria-hidden="true">
          <div className="landing-preview-card">
            <div className="landing-preview-header">
              <p className="landing-preview-title">Applications</p>
              <p className="landing-preview-meta">3 active</p>
            </div>
            <ul className="landing-preview-list">
              {PREVIEW_APPLICATIONS.map((item) => (
                <li key={`${item.company}-${item.position}`}>
                  <div>
                    <p className="landing-preview-company">{item.company}</p>
                    <p className="landing-preview-position">{item.position}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
            <div className="landing-preview-deadline">
              <p className="landing-preview-deadline-label">Next deadline</p>
              <p className="landing-preview-deadline-value">
                Google · Backend Engineer
              </p>
              <p className="landing-preview-deadline-date">
                Interview in 5 days
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="landing-features"
        aria-labelledby="landing-features-heading"
      >
        <div className="landing-section-intro">
          <h2 id="landing-features-heading">
            Everything you need to stay organized
          </h2>
          <p>
            A focused workspace for tracking applications without the clutter.
          </p>
        </div>
        <ul className="landing-feature-grid">
          <li className="landing-feature-card">
            <span className="landing-feature-icon">
              <FeatureIcon name="track" />
            </span>
            <h3>Track Applications</h3>
            <p>Keep every job application organized in one place.</p>
          </li>
          <li className="landing-feature-card">
            <span className="landing-feature-icon">
              <FeatureIcon name="schedule" />
            </span>
            <h3>Stay on Schedule</h3>
            <p>Keep deadlines and important dates visible.</p>
          </li>
          <li className="landing-feature-card">
            <span className="landing-feature-icon">
              <FeatureIcon name="progress" />
            </span>
            <h3>Follow Your Progress</h3>
            <p>See where every application stands from saved to offer.</p>
          </li>
        </ul>
      </section>

      <section className="landing-cta" aria-labelledby="landing-cta-heading">
        <h2 id="landing-cta-heading">Ready to organize your job search?</h2>
        <Link to="/register" className="btn btn-primary">
          Get Started
        </Link>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <p className="landing-footer-name">Deadline Dash</p>
          <p>Track your applications. Stay ahead of your deadlines.</p>
        </div>
        <p className="landing-footer-copy">© 2026 Deadline Dash</p>
      </footer>
    </div>
  )
}
