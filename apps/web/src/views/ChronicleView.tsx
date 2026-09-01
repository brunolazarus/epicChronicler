import { EmptyStateShell } from './EmptyStateShell.js'
import { getFlavourTheme } from '../theme.js'

interface FlavourSummary { key: string; name: string; description: string }

export function ChronicleView({ chronicleText, audioKey, transcript, flavours, selectedFlavour, retellAs, jobOutcome, restart }: {
  chronicleText: string | null; audioKey: string | null; transcript: string
  flavours: FlavourSummary[]; selectedFlavour: string | null
  retellAs: (key: string) => void; jobOutcome: 'expired' | 'failed' | null; restart: () => void
}) {
  if (jobOutcome) return <EmptyStateShell kind={jobOutcome === 'expired' ? 'expired' : 'generic'} jobId="—" onPrimary={restart} />

  const theme = getFlavourTheme(selectedFlavour ?? 'medieval')

  return (
    <div style={{ maxWidth: 1080, margin: '60px auto', padding: '0 48px' }}>
      <div style={{ border: '1px solid var(--color-line)', borderRadius: 14, overflow: 'hidden', background: 'var(--color-surface)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr' }}>
          <div style={{ padding: 24, borderRight: '1px solid var(--color-line)', background: 'var(--color-panel)' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-fg-faint)', marginBottom: 18 }}>
              What you said
            </div>
            <div style={{ color: 'var(--color-fg-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{transcript}</div>
          </div>
          <div style={{ padding: '28px 34px' }}>
            <div style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 11 }}>{theme.name}</div>
            <div data-testid="chronicle-text" style={{ color: 'var(--color-fg)', fontFamily: 'Inter, sans-serif', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {chronicleText ?? 'Your chronicle will appear here…'}
            </div>
            {audioKey && <audio data-testid="tts-player" controls src={`/api/v1/pipeline/audio/${audioKey}`} style={{ width: '100%', marginTop: 20 }} />}
            <div style={{ marginTop: 26, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-fg-muted)', fontSize: 11.5, marginRight: 4 }}>Tell it again as</span>
              {flavours.map((f) => {
                const t = getFlavourTheme(f.key)
                const on = f.key === selectedFlavour
                return (
                  <div key={f.key} data-testid={`retell-${f.key}`} data-flavour={f.key} onClick={() => retellAs(f.key)}
                    style={{ padding: '7px 13px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${on ? 'var(--accent)' : 'var(--color-line-muted)'}`, background: on ? 'var(--accent-ghost)' : 'transparent', color: on ? 'var(--color-fg)' : 'var(--color-fg-muted)', fontSize: 12 }}>
                    {t.short}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
