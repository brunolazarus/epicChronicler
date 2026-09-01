export function RecordRing({ micError, isRecording, onStart, onStop, onUploadInstead, onRetryMic }: {
  micError: boolean; isRecording: boolean
  onStart: () => void; onStop: () => void; onUploadInstead: () => void; onRetryMic: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div
        data-testid="btn-record"
        role="button"
        onClick={micError ? undefined : isRecording ? onStop : onStart}
        style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: micError ? 'default' : 'pointer' }}
      >
        <div style={{ position: 'absolute', inset: -26, borderRadius: '50%', background: `radial-gradient(circle, ${micError ? 'var(--error-soft)' : 'var(--accent)'} 0%, transparent 62%)` }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: micError ? '1px dashed var(--error-line)' : '1px solid var(--accent)', animation: micError ? 'none' : 'ringout 2.8s ease-out infinite' }} />
        <div style={{ position: 'absolute', inset: 26, borderRadius: '50%', border: `1px solid ${micError ? 'var(--error-line)' : 'var(--accent)'}` }} />
        <div style={{ position: 'absolute', inset: 48, borderRadius: '50%', border: `1px solid ${micError ? 'var(--error)' : 'var(--accent)'}`, background: 'rgba(10,11,16,.55)' }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {micError ? (
            <span style={{ color: 'var(--error)', fontSize: 30 }}>⦸</span>
          ) : (
            <div style={{ width: 15, height: 15, borderRadius: '50%', background: 'var(--accent)', animation: 'recpulse 1.6s ease-in-out infinite' }} />
          )}
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '12.5px', letterSpacing: '.08em', textTransform: 'uppercase', color: micError ? 'var(--error-text)' : 'var(--color-fg)' }}>
            {micError ? 'Mic blocked' : isRecording ? 'Stop' : 'Record'}
          </span>
        </div>
      </div>
      {micError && (
        <div style={{ width: 300, padding: '14px 16px', border: '1px solid var(--error-line)', borderRadius: 8, background: 'rgba(10,11,16,.62)' }}>
          <div style={{ color: 'var(--error-text)', fontWeight: 500, fontSize: '12.5px', marginBottom: 6 }}>Your browser blocked the microphone</div>
          <p style={{ color: 'var(--color-fg-soft)', fontSize: 12, margin: '0 0 12px' }}>Allow microphone access for this site in your browser settings, then try again.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '7px 14px', border: '1px solid var(--error)', borderRadius: 999, cursor: 'pointer', color: 'var(--error-text)', background: 'var(--error-ghost)' }} onClick={onRetryMic}>Try again</div>
            <div style={{ padding: '7px 14px', borderRadius: 999, cursor: 'pointer', color: 'var(--color-fg-soft)' }} onClick={onUploadInstead}>Upload a file</div>
          </div>
        </div>
      )}
    </div>
  )
}
