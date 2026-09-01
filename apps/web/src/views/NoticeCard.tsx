import { errorPalette } from '../theme.js'

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
  const e = errorPalette()
  return (
    <div style={{ border: `1px solid ${e.line}`, borderRadius: 8, background: '#131424', overflow: 'hidden' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${e.base}, transparent)` }} />
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 'none', marginTop: 1, display: 'flex', color: e.base, filter: `drop-shadow(0 0 8px ${e.soft})` }}>
          <WarningIcon color={e.base} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 7 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 14, color: e.text }}>{title}</span>
          </div>
          <p style={{ margin: '0 0 10px', fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: 1.65, color: '#b2b6ca', maxWidth: 620 }}>
            {body}
          </p>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '9px 12px',
              border: '1px solid #292b31', borderRadius: 6, background: '#161826',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '11.5px', color: e.text,
            }}
          >
            {detail}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div
              onClick={onPrimary}
              style={{ padding: '8px 15px', border: `1px solid ${e.base}`, borderRadius: 999, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '12.5px', color: e.text, background: e.ghost }}
            >
              {primaryLabel}
            </div>
            <div
              onClick={onSecondary}
              style={{ padding: '8px 15px', borderRadius: 999, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12.5px', color: '#b2b6ca' }}
            >
              {secondaryLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
