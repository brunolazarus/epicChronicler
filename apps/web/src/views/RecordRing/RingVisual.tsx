import { MicrophoneSlashIcon } from '@/lib/icons.js'

export function RingVisual({
  isMarker,
  micError,
  pipelineLive,
  label,
}: {
  isMarker: boolean
  micError: boolean
  pipelineLive?: boolean
  label?: string
}) {
  return (
    <>
      <div
        className="absolute -inset-6 rounded-full"
        style={{
          background: `radial-gradient(circle, ${micError ? 'var(--error-soft)' : 'var(--accent)'} 0%, transparent 62%)`,
        }}
      />
      <div
        className={[
          'absolute inset-0 rounded-full border',
          micError ? 'border-dashed border-error-line' : 'border-accent-line',
          !isMarker && !micError ? 'animate-ringout' : '',
        ].join(' ')}
        style={isMarker ? { opacity: 0 } : undefined}
      />
      <div
        className={`absolute inset-[26px] rounded-full border ${micError ? 'border-error-line' : 'border-accent-line'}`}
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
    </>
  )
}
