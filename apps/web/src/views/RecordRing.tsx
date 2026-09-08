import { Button } from '@/components/ui/button.js'
import { MicrophoneSlashIcon } from '@/lib/icons.js'

export function RecordRing({
  slot,
  micError,
  isRecording,
  elapsedLabel,
  pipelineLive,
  onStart,
  onStop,
  onUploadInstead,
  onRetryMic,
  ...rest
}: {
  slot: 'hero' | 'timer' | 'marker'
  micError: boolean
  isRecording: boolean
  elapsedLabel?: string
  pipelineLive?: boolean
  onStart: () => void
  onStop: () => void
  onUploadInstead: () => void
  onRetryMic: () => void
} & React.HTMLAttributes<HTMLDivElement>) {
  const isMarker = slot === 'marker'
  const interactive = !isMarker && !micError

  const label = micError ? 'MIC BLOCKED' : slot === 'timer' ? elapsedLabel : isRecording ? 'Stop' : 'RECORD'

  return (
    <div className="flex w-full flex-col items-center gap-5" {...rest}>
      <div
        data-testid={isMarker ? undefined : 'btn-record'}
        role={isMarker ? undefined : 'button'}
        tabIndex={isMarker ? undefined : micError ? -1 : 0}
        onClick={interactive ? (isRecording ? onStop : onStart) : undefined}
        onKeyDown={
          isMarker
            ? undefined
            : (e) => {
                if (micError) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  ;(isRecording ? onStop : onStart)()
                }
              }
        }
        className={[
          // max-w caps the ring when the shell widens the slot to fit an error card beside it
          'relative flex aspect-square w-full max-w-(--ring-size) shrink-0 items-center justify-center',
          !isMarker && !micError ? 'cursor-pointer' : 'cursor-default',
        ].join(' ')}
      >
        <div
          className="absolute -inset-6 rounded-full"
          style={{
            background: `radial-gradient(circle, ${micError ? 'var(--error-soft)' : 'var(--accent)'} 0%, transparent 62%)`,
          }}
        />
        <div
          className={[
            'absolute inset-0 rounded-full border',
            micError ? 'border-dashed border-error-line' : 'border-accent',
            !isMarker && !micError ? 'animate-ringout' : '',
          ].join(' ')}
          style={isMarker ? { opacity: 0 } : undefined}
        />
        <div
          className={`absolute inset-[26px] rounded-full border ${micError ? 'border-error-line' : 'border-accent'}`}
          style={isMarker ? { opacity: 0 } : undefined}
        />
        <div
          className={[
            'absolute rounded-full bg-abyss/55 border',
            isMarker ? 'inset-0' : 'inset-12',
            micError ? 'border-error' : 'border-accent',
          ].join(' ')}
          style={isMarker ? { boxShadow: '0 0 14px var(--accent)' } : undefined}
        />
        <div
          className={
            isMarker
              ? `absolute inset-1/3 rounded-full bg-accent ${pipelineLive ? 'animate-recpulse' : ''}`
              : 'relative flex flex-col items-center gap-2'
          }
          style={isMarker ? { boxShadow: '0 0 14px var(--accent)' } : undefined}
        >
          {!isMarker && (
            <>
              {micError ? (
                <MicrophoneSlashIcon size={30} className="text-error" />
              ) : (
                <div className="h-[15px] w-[15px] rounded-full bg-accent animate-recpulse" />
              )}
              <span
                className={`text-[12.5px] font-medium uppercase tracking-[.08em] ${micError ? 'text-error-fg' : 'text-fg'}`}
              >
                {label}
              </span>
            </>
          )}
        </div>
      </div>

      {micError && (
        <div className="w-[300px] max-w-full rounded-lg border border-error-line bg-abyss/60 px-4 py-[14px]">
          <div className="mb-1.5 text-[12.5px] font-medium text-error-fg">Your browser blocked the microphone</div>
          <p className="mb-3 text-xs text-fg-soft">
            Allow microphone access for this site in your browser settings, then try again.
          </p>
          <div className="flex gap-2">
            <Button variant="error" size="sm" data-error-control onClick={onRetryMic}>
              Try again
            </Button>
            <Button variant="ghost" size="sm" onClick={onUploadInstead}>Upload a file</Button>
          </div>
        </div>
      )}
    </div>
  )
}
