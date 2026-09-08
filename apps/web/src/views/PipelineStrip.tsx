import { Button } from '@/components/ui/button.js'
import { WarningCircleIcon } from '@/lib/icons.js'

export type StageKey = 'transcribe' | 'rewrite' | 'narrate'
export type StageStatus = 'done' | 'active' | 'queued' | 'failed' | 'blocked' | 'held'

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

const HELD_TRACK = 'repeating-linear-gradient(90deg, #3f424d 0 5px, transparent 5px 10px)'

export function PipelineStrip({ stages, transcriptionMs, generateError, onRetry, collapsed }: {
  stages: PipelineStage[]
  transcriptionMs: number | null
  generateError: string | null
  onRetry: () => void
  collapsed?: boolean
}) {
  return (
    <div
      data-testid="pipeline-strip"
      style={collapsed ? { height: 0, overflow: 'hidden', transition: 'height var(--dur-scene) var(--ease)' } : undefined}
    >
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
            : stage.status === 'held' ? 'waiting for you'
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
              <div
                className="mt-[7px] h-0.5 overflow-hidden rounded-[1px] bg-line"
                style={stage.status === 'held' ? { background: HELD_TRACK } : undefined}
              >
                {fillVar && (
                  <div
                    className="h-full rounded-[1px]"
                    style={{
                      width: `${stage.pct}%`,
                      background: fillVar,
                      boxShadow: `0 0 10px ${fillVar}`,
                      transition: 'width var(--dur-bar) var(--ease)',
                    }}
                  />
                )}
              </div>
              {stage.status === 'failed' && (
                <div className="mt-3 rounded-r-lg border border-error-line border-l-2 border-l-error bg-error-ghost px-[15px] py-[13px]">
                  <div className="mb-1.5 flex items-center gap-1.5 font-sans text-[12.5px] font-medium text-error-fg">
                    <WarningCircleIcon size={16} />
                    {STAGE_ERROR_TITLE[stage.key]}
                  </div>
                  <p className="mb-3 font-sans text-xs leading-[1.6] text-fg-soft">{generateError}</p>
                  <Button variant="error" size="sm" onClick={onRetry} className="font-sans" data-error-control>
                    {STAGE_RETRY_LABEL[stage.key]}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
