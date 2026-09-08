import { Card } from '@/components/ui/card.js'
import { PipelineStrip, type PipelineStage } from './PipelineStrip.js'

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
    <div className="mx-auto my-16 max-w-[760px] px-6 md:my-20 md:px-12">
      <Card className="overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,.45)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel-raised px-[22px] py-3.5">
          <span className="font-mono text-[12.5px] font-medium uppercase tracking-[.1em]">TELLING YOUR STORY</span>
          <div className={`flex items-center gap-[7px] font-mono text-[11px] ${hasFailure ? 'text-error-fg' : 'text-fg-muted'}`}>
            <div
              className={`h-1.5 w-1.5 rounded-full ${hasFailure ? 'bg-error' : 'bg-accent animate-recpulse'}`}
              style={{ boxShadow: `0 0 10px ${hasFailure ? 'var(--error)' : 'var(--accent)'}` }}
            />
            {hasFailure ? 'failed' : 'working'}
          </div>
        </div>

        <div className="bg-panel px-[26px] pb-[30px] pt-7">
          <PipelineStrip
            stages={stages}
            transcriptionMs={transcriptionMs}
            generateError={generateError}
            onRetry={onRetry}
          />

          <div className="mt-[26px] border-t border-line pt-5 font-mono text-[11.5px] leading-[1.9] text-fg-muted">
            <div>&gt; upload accepted</div>
            <div>&gt; flavour {flavourKey} → voice {voice}</div>
            <div>&gt; raw audio discarded ✓</div>
            {stages.filter((s) => s.status === 'failed').map((s) => (
              <div key={s.key} className="text-error-fg">&gt; {s.key} failed</div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
