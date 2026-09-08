import { Button } from '@/components/ui/button.js'
import { Card } from '@/components/ui/card.js'
import { ClockCounterClockwiseIcon, WarningCircleIcon } from '@/lib/icons.js'

export function EmptyStateShell({ kind, jobId, onPrimary }: {
  kind: 'expired' | 'generic'
  jobId: string
  onPrimary: () => void
}) {
  const isExpired = kind === 'expired'
  const title = isExpired ? 'This session has ended' : 'Something went wrong'
  const body = isExpired
    ? 'Chronicler keeps nothing after you leave, so this chronicle is gone. Nothing was stored, and nothing was shared.'
    : "We couldn't finish telling your story. This one is on us — trying again usually works."
  const detail = isExpired ? `job ${jobId} · expired` : `job ${jobId} · error`
  const ctaLabel = isExpired ? 'Start a new chronicle' : 'Try again'
  const markColor = isExpired ? 'text-fg-muted' : 'text-error'

  return (
    <Card className="mx-auto my-16 w-full max-w-[560px] overflow-hidden bg-surface shadow-[0_16px_40px_rgba(0,0,0,.45)]">
      <div className="flex gap-6 border-b border-line bg-panel-raised px-6 font-mono text-[11.5px]">
        <div className="flex-none py-3.5 text-fg-faint">transcript + chronicle</div>
        <div className="flex-none py-3.5 text-fg-faint">audio</div>
        <div className="flex-none py-3.5 text-fg-faint">share</div>
        {/* min-w-0 + break-all: jobId is a full randomUUID(), and a flex item will not shrink
            below min-content on its own — without these it overflows the card's clipped edge */}
        <div className={`ml-auto min-w-0 break-all py-3.5 text-right ${isExpired ? 'text-fg-muted' : 'text-error-fg'}`}>{detail}</div>
      </div>
      <div className="flex flex-col items-center px-6 py-12 text-center md:px-10">
        <div className="relative mb-[26px] flex h-[88px] w-[88px] items-center justify-center">
          <div
            className="absolute -inset-3.5 rounded-full"
            style={{ background: `radial-gradient(circle, ${isExpired ? 'rgba(233,233,237,.06)' : 'var(--error-soft)'} 0%, transparent 62%)` }}
          />
          <div className={`absolute inset-0 rounded-full border border-dashed ${isExpired ? 'border-line-muted' : 'border-error-line'}`} />
          <div className="absolute inset-5 rounded-full bg-abyss/50" />
          <div className={`relative flex ${markColor}`}>
            {isExpired ? <ClockCounterClockwiseIcon size={34} /> : <WarningCircleIcon size={34} />}
          </div>
        </div>
        <h2 className="mb-3 text-2xl font-medium leading-tight tracking-[-.02em] text-fg">{title}</h2>
        <p className="mb-2 max-w-[400px] text-sm leading-[1.7] text-fg-soft">{body}</p>
        <p className="mb-[26px] max-w-full break-all font-mono text-[11.5px] leading-[1.6] text-fg-muted">{detail}</p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Button
            variant={isExpired ? 'outline' : 'error'}
            onClick={onPrimary}
            {...(!isExpired ? { 'data-error-control': true } : {})}
          >
            {ctaLabel}
          </Button>
          {!isExpired && (
            <Button variant="ghost" onClick={onPrimary}>Back to start</Button>
          )}
        </div>
      </div>
    </Card>
  )
}
