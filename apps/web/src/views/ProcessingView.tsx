import { Button } from '@/components/ui/button.js'

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
    <div className="mx-auto my-16 max-w-[760px] px-6 md:my-20 md:px-12">
      <div className="overflow-hidden rounded-card border border-line shadow-[0_16px_40px_rgba(0,0,0,.45)]">
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
          <div className="flex flex-col gap-[18px] font-mono text-xs leading-[1.5]">
            {stages.map((stage) => {
              const statusColor =
                stage.status === 'failed' ? 'text-error-fg'
                : stage.status === 'done' || stage.status === 'active' ? 'text-accent'
                : 'text-fg-muted'
              const statusText =
                stage.status === 'done' ? (stage.key === 'transcribe' ? `done ${transcriptionMs}ms` : 'done')
                : stage.status === 'active' ? `${stage.pct}%`
                : stage.status === 'queued' ? 'queued'
                : stage.status === 'failed' ? `failed at ${stage.pct}%`
                : 'blocked'
              const fillVar =
                stage.status === 'done' || stage.status === 'active' ? 'var(--accent)'
                : stage.status === 'failed' ? 'var(--error)'
                : null

              return (
                <div key={stage.key}>
                  <div className="flex justify-between">
                    <span>{STAGE_LABEL[stage.key]}</span>
                    <span className={statusColor}>{statusText}</span>
                  </div>
                  <div className="mt-[7px] h-0.5 overflow-hidden rounded-[1px] bg-line">
                    {fillVar && (
                      <div
                        className="h-full rounded-[1px]"
                        style={{ width: `${stage.pct}%`, background: fillVar, boxShadow: `0 0 10px ${fillVar}` }}
                      />
                    )}
                  </div>
                  {stage.status === 'failed' && (
                    <div className="mt-3 rounded-r-lg border border-error-line border-l-2 border-l-error bg-error-ghost px-[15px] py-[13px]">
                      <div className="mb-1.5 text-[12.5px] font-medium text-error-fg [font-family:var(--font-sans)]">
                        {STAGE_ERROR_TITLE[stage.key]}
                      </div>
                      <p className="mb-3 text-xs leading-[1.6] text-fg-soft [font-family:var(--font-sans)]">{generateError}</p>
                      <Button size="sm" onClick={onRetry} className="border-error bg-error-ghost text-error-fg [font-family:var(--font-sans)]">
                        {STAGE_RETRY_LABEL[stage.key]}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-[26px] border-t border-line pt-5 font-mono text-[11.5px] leading-[1.9] text-fg-muted">
            <div>&gt; upload accepted</div>
            <div>&gt; flavour {flavourKey} → voice {voice}</div>
            <div>&gt; raw audio discarded ✓</div>
            {stages.filter((s) => s.status === 'failed').map((s) => (
              <div key={s.key} className="text-error-fg">&gt; {s.key} failed</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
