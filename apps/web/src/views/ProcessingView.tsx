type StageKey = 'transcribe' | 'rewrite' | 'narrate'
type StageStatus = 'done' | 'active' | 'queued' | 'failed' | 'blocked'

export interface PipelineStage {
  key: StageKey
  status: StageStatus
  pct: number
}

const STAGE_LABEL: Record<StageKey, string> = {
  transcribe: 'transcribe · groq whisper v3',
  rewrite: 'rewrite · claude sonnet',
  narrate: 'narrate · kokoro 82m',
}

const STAGE_ERROR_TITLE: Record<StageKey, string> = {
  transcribe: 'Transcription failed',
  rewrite: 'The narrator couldn’t finish this one',
  narrate: 'Narration didn’t come through',
}

const STAGE_RETRY_LABEL: Record<StageKey, string> = {
  transcribe: 'Retry transcription',
  rewrite: 'Retry rewrite',
  narrate: 'Retry narration',
}

export function ProcessingView({ stages, transcriptionMs, flavourKey, voice, generateError, onRetry }: {
  stages: PipelineStage[]
  transcriptionMs: number | null
  flavourKey: string
  voice: string
  generateError: string | null
  onRetry: () => void
}) {
  const hasFailure = stages.some((s) => s.status === 'failed')

  return (
    <div style={{ maxWidth: 760, margin: '80px auto', padding: '0 48px' }}>
      <div style={{ border: '1px solid var(--color-line)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,.45)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderBottom: '1px solid var(--color-line)', background: 'var(--color-panel-raised)' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: '12.5px', letterSpacing: '.1em', textTransform: 'uppercase' }}>
            TELLING YOUR STORY
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: hasFailure ? 'var(--error-text)' : 'var(--color-fg-muted)' }}>
            <div
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: hasFailure ? 'var(--error)' : 'var(--accent)',
                boxShadow: `0 0 10px ${hasFailure ? 'var(--error)' : 'var(--accent)'}`,
                ...(hasFailure ? {} : { animation: 'recpulse 1.6s ease-in-out infinite' }),
              }}
            />
            {hasFailure ? 'failed' : 'working'}
          </div>
        </div>
        <div style={{ padding: '28px 26px 30px', background: 'var(--color-panel)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.5 }}>
            {stages.map((stage) => {
              const statusColor =
                stage.status === 'failed' ? 'var(--error-text)'
                : stage.status === 'done' || stage.status === 'active' ? 'var(--accent)'
                : 'var(--color-fg-muted)'
              const statusText =
                stage.status === 'done' ? (stage.key === 'transcribe' ? `done ${transcriptionMs}ms` : 'done')
                : stage.status === 'active' ? `${stage.pct}%`
                : stage.status === 'queued' ? 'queued'
                : stage.status === 'failed' ? `failed at ${stage.pct}%`
                : 'blocked'
              const fillColor = stage.status === 'done' || stage.status === 'active' ? 'var(--accent)' : stage.status === 'failed' ? 'var(--error)' : null

              return (
                <div key={stage.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{STAGE_LABEL[stage.key]}</span>
                    <span style={{ color: statusColor }}>{statusText}</span>
                  </div>
                  <div style={{ marginTop: 7, height: 2, background: 'var(--color-line)', borderRadius: 1, overflow: 'hidden' }}>
                    {fillColor && (
                      <div style={{ width: `${stage.pct}%`, height: '100%', borderRadius: 1, background: fillColor, boxShadow: `0 0 10px ${fillColor}` }} />
                    )}
                  </div>
                  {stage.status === 'failed' && (
                    <div
                      style={{
                        marginTop: 12, padding: '13px 15px', border: '1px solid var(--error-line)',
                        borderLeft: '2px solid var(--error)', borderRadius: '0 8px 8px 0', background: 'rgba(242,104,95,.05)',
                      }}
                    >
                      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '12.5px', color: 'var(--error-text)', marginBottom: 6 }}>
                        {STAGE_ERROR_TITLE[stage.key]}
                      </div>
                      <p style={{ margin: '0 0 12px', fontFamily: 'Inter, sans-serif', fontSize: 12, lineHeight: 1.6, color: 'var(--color-fg-soft)' }}>
                        {generateError}
                      </p>
                      <div
                        onClick={onRetry}
                        style={{ display: 'inline-block', padding: '7px 14px', border: '1px solid var(--error)', borderRadius: 999, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 12, color: 'var(--error-text)', background: 'var(--error-ghost)' }}
                      >
                        {STAGE_RETRY_LABEL[stage.key]}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid var(--color-line)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11.5px', lineHeight: 1.9, color: 'var(--color-fg-muted)' }}>
            <div>&gt; upload accepted</div>
            <div>&gt; flavour {flavourKey} → voice {voice}</div>
            <div>&gt; raw audio discarded ✓</div>
            {stages.filter((s) => s.status === 'failed').map((s) => (
              <div key={s.key} style={{ color: 'var(--error-text)' }}>&gt; {s.key} failed</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
