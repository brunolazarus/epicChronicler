export function ReviewStep({ transcript, setTranscript, confirmTranscript }: {
  transcript: string; setTranscript: (text: string) => void; confirmTranscript: () => void
}) {
  return (
    <div style={{ maxWidth: 760, margin: '80px auto', padding: '0 48px' }}>
      <div style={{ border: '1px solid #292b31', borderRadius: 14, padding: '28px 26px', background: '#131424' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#595d6c', marginBottom: 16 }}>
          What you said
        </div>
        <textarea
          data-testid="transcript"
          rows={6}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          style={{ width: '100%', background: '#161826', border: '1px solid #292b31', borderRadius: 8, color: '#e9e9ed', padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
        />
        <button
          data-testid="btn-generate"
          onClick={confirmTranscript}
          disabled={!transcript.trim()}
          style={{ marginTop: 16, padding: '11px 22px', border: '1px solid #b2b6ca', borderRadius: 999, background: 'transparent', color: '#e9e9ed', cursor: 'pointer' }}
        >
          Tell the story
        </button>
      </div>
    </div>
  )
}
