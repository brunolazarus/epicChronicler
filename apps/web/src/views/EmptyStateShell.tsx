import { errorPalette } from '../theme.js'

function ClockIcon({ color }: { color: string }) {
  return (
    <svg width={34} height={34} viewBox="0 0 256 256" fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flex: 'none' }}>
      <circle cx={128} cy={128} r={96} />
      <path d="M128,72v56h48" />
    </svg>
  )
}

function WarningIcon({ color }: { color: string }) {
  return (
    <svg width={34} height={34} viewBox="0 0 256 256" fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flex: 'none' }}>
      <circle cx={128} cy={128} r={96} />
      <line x1={128} y1={76} x2={128} y2={140} />
      <circle cx={128} cy={176} r={8} fill={color} stroke="none" />
    </svg>
  )
}

export function EmptyStateShell({ kind, jobId, onPrimary }: {
  kind: 'expired' | 'generic'
  jobId: string
  onPrimary: () => void
}) {
  const e = errorPalette()
  const isExpired = kind === 'expired'

  const ring = isExpired ? '#3f424d' : e.line
  const glow = isExpired ? 'rgba(233,233,237,.06)' : e.soft
  const markColor = isExpired ? '#9397ab' : e.base
  const title = isExpired ? 'This session has ended' : 'Something went wrong'
  const body = isExpired
    ? 'Chronicler keeps nothing after you leave, so this chronicle is gone. Nothing was stored, and nothing was shared.'
    : "We couldn't finish telling your story. This one is on us — trying again usually works."
  const detail = isExpired ? `job ${jobId} · expired` : `job ${jobId} · error`
  const ctaLabel = isExpired ? 'Start a new chronicle' : 'Try again'
  const ctaLine = isExpired ? '#b2b6ca' : e.base
  const ctaText = isExpired ? '#e9e9ed' : e.text
  const ctaFill = isExpired ? 'transparent' : e.ghost
  const metaColor = isExpired ? '#9397ab' : e.text
  const metaText = detail

  return (
    <div style={{ maxWidth: 560, border: '1px solid #292b31', borderRadius: 14, background: '#161826', boxShadow: '0 16px 40px rgba(0,0,0,.45)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 24, padding: '0 24px', borderBottom: '1px solid #292b31', background: '#1b1d2c', fontFamily: "'JetBrains Mono', monospace", fontSize: '11.5px' }}>
        <div style={{ padding: '14px 0', color: '#595d6c' }}>transcript + chronicle</div>
        <div style={{ padding: '14px 0', color: '#595d6c' }}>audio</div>
        <div style={{ padding: '14px 0', color: '#595d6c' }}>share</div>
        <div style={{ marginLeft: 'auto', padding: '14px 0', color: metaColor }}>{metaText}</div>
      </div>
      <div style={{ padding: '54px 40px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 26 }}>
          <div style={{ position: 'absolute', inset: -14, borderRadius: '50%', background: `radial-gradient(circle, ${glow} 0%, transparent 62%)` }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px dashed ${ring}` }} />
          <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: 'rgba(10,11,16,.5)' }} />
          <div style={{ position: 'relative', display: 'flex', color: markColor }}>
            {isExpired ? <ClockIcon color={markColor} /> : <WarningIcon color={markColor} />}
          </div>
        </div>
        <h2 style={{ margin: '0 0 12px', fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 24, lineHeight: 1.2, letterSpacing: '-.02em', color: '#e9e9ed' }}>
          {title}
        </h2>
        <p style={{ margin: '0 0 8px', fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: 1.7, color: '#b2b6ca', maxWidth: 400 }}>
          {body}
        </p>
        <p style={{ margin: '0 0 26px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11.5px', lineHeight: 1.6, color: '#9397ab' }}>
          {detail}
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div
            onClick={onPrimary}
            style={{ padding: '11px 22px', border: `1px solid ${ctaLine}`, borderRadius: 999, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '13.5px', color: ctaText, background: ctaFill }}
          >
            {ctaLabel}
          </div>
          {!isExpired && (
            <div
              onClick={onPrimary}
              style={{ padding: '11px 18px', borderRadius: 999, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13.5px', color: '#b2b6ca' }}
            >
              Back to start
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
