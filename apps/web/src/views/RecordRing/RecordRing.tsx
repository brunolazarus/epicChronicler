import { RingVisual } from './RingVisual.js'
import { MicErrorNotice } from './MicErrorNotice.js'

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
        <RingVisual isMarker={isMarker} micError={micError} pipelineLive={pipelineLive} label={label} />
      </div>

      {micError && <MicErrorNotice onRetryMic={onRetryMic} onUploadInstead={onUploadInstead} />}
    </div>
  )
}
