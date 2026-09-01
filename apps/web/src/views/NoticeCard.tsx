function WarningIcon({ color }: { color: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 256 256" fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flex: 'none' }}>
      <circle cx={128} cy={128} r={96} />
      <line x1={128} y1={76} x2={128} y2={140} />
      <circle cx={128} cy={176} r={8} fill={color} stroke="none" />
    </svg>
  )
}

export function NoticeCard({ title, body, detail, onPrimary, primaryLabel, onSecondary, secondaryLabel }: {
  title: string
  body: string
  detail: string
  onPrimary: () => void
  primaryLabel: string
  onSecondary: () => void
  secondaryLabel: string
}) {
  return (
    <div style={{ border: '1px solid var(--error-line)', borderRadius: 8, background: 'var(--color-panel)', overflow: 'hidden' }}>
      <div style={{ height: 2, background: 'linear-gradient(90deg, var(--error), transparent)' }} />
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 'none', marginTop: 1, display: 'flex', color: 'var(--error)', filter: 'drop-shadow(0 0 8px var(--error-soft))' }}>
          <WarningIcon color={'var(--error)'} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 7 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 14, color: 'var(--error-text)' }}>{title}</span>
          </div>
          <p style={{ margin: '0 0 10px', fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: 1.65, color: 'var(--color-fg-soft)', maxWidth: 620 }}>
            {body}
          </p>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '9px 12px',
              border: '1px solid var(--color-line)', borderRadius: 6, background: 'var(--color-surface)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '11.5px', color: 'var(--error-text)',
            }}
          >
            {detail}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div
              onClick={onPrimary}
              style={{ padding: '8px 15px', border: '1px solid var(--error)', borderRadius: 999, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '12.5px', color: 'var(--error-text)', background: 'var(--error-ghost)' }}
            >
              {primaryLabel}
            </div>
            <div
              onClick={onSecondary}
              style={{ padding: '8px 15px', borderRadius: 999, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12.5px', color: 'var(--color-fg-soft)' }}
            >
              {secondaryLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
