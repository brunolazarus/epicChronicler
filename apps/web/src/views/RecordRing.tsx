import { Button } from '@/components/ui/button.js'

export function RecordRing({ micError, isRecording, onStart, onStop, onUploadInstead, onRetryMic }: {
  micError: boolean
  isRecording: boolean
  onStart: () => void
  onStop: () => void
  onUploadInstead: () => void
  onRetryMic: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div
        data-testid="btn-record"
        role="button"
        tabIndex={micError ? -1 : 0}
        onClick={micError ? undefined : isRecording ? onStop : onStart}
        onKeyDown={(e) => {
          if (micError) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            ;(isRecording ? onStop : onStart)()
          }
        }}
        className={[
          'relative flex items-center justify-center',
          'h-[clamp(160px,44vw,200px)] w-[clamp(160px,44vw,200px)]',
          micError ? 'cursor-default' : 'cursor-pointer',
        ].join(' ')}
      >
        <div
          className="absolute -inset-6 rounded-full"
          style={{
            background: `radial-gradient(circle, ${micError ? 'var(--error-soft)' : 'var(--accent)'} 0%, transparent 62%)`,
          }}
        />
        <div
          className={
            micError
              ? 'absolute inset-0 rounded-full border border-dashed border-error-line'
              : 'absolute inset-0 rounded-full border border-accent animate-ringout'
          }
        />
        <div className={`absolute inset-[26px] rounded-full border ${micError ? 'border-error-line' : 'border-accent'}`} />
        <div className={`absolute inset-12 rounded-full bg-abyss/55 border ${micError ? 'border-error' : 'border-accent'}`} />
        <div className="relative flex flex-col items-center gap-2">
          {micError ? (
            <span className="text-[30px] text-error">⦸</span>
          ) : (
            <div className="h-[15px] w-[15px] rounded-full bg-accent animate-recpulse" />
          )}
          <span
            className={`text-[12.5px] font-medium uppercase tracking-[.08em] ${micError ? 'text-error-fg' : 'text-fg'}`}
          >
            {micError ? 'Mic blocked' : isRecording ? 'Stop' : 'Record'}
          </span>
        </div>
      </div>

      {micError && (
        <div className="w-[300px] max-w-full rounded-lg border border-error-line bg-abyss/60 px-4 py-[14px]">
          <div className="mb-1.5 text-[12.5px] font-medium text-error-fg">Your browser blocked the microphone</div>
          <p className="mb-3 text-xs text-fg-soft">
            Allow microphone access for this site in your browser settings, then try again.
          </p>
          <div className="flex gap-2">
            <Button variant="error" size="sm" onClick={onRetryMic}>
              Try again
            </Button>
            <Button variant="ghost" size="sm" onClick={onUploadInstead}>Upload a file</Button>
          </div>
        </div>
      )}
    </div>
  )
}
