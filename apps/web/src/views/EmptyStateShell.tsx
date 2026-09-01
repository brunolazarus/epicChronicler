import { Button } from '@/components/ui/button.js'
import { Card } from '@/components/ui/card.js'

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg width={34} height={34} viewBox="0 0 256 256" fill="none" stroke="currentColor"
      strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx={128} cy={128} r={96} />
      <path d="M128,72v56h48" />
    </svg>
  )
}
function WarningIcon({ className }: { className?: string }) {
  return (
    <svg width={34} height={34} viewBox="0 0 256 256" fill="none" stroke="currentColor"
      strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx={128} cy={128} r={96} />
      <line x1={128} y1={76} x2={128} y2={140} />
      <circle cx={128} cy={176} r={8} fill="currentColor" stroke="none" />
    </svg>
  )
}

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
        <div className="py-3.5 text-fg-faint">transcript + chronicle</div>
        <div className="py-3.5 text-fg-faint">audio</div>
        <div className="py-3.5 text-fg-faint">share</div>
        <div className={`ml-auto py-3.5 ${isExpired ? 'text-fg-muted' : 'text-error-fg'}`}>{detail}</div>
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
            {isExpired ? <ClockIcon /> : <WarningIcon />}
          </div>
        </div>
        <h2 className="mb-3 text-2xl font-medium leading-tight tracking-[-.02em] text-fg">{title}</h2>
        <p className="mb-2 max-w-[400px] text-sm leading-[1.7] text-fg-soft">{body}</p>
        <p className="mb-[26px] font-mono text-[11.5px] leading-[1.6] text-fg-muted">{detail}</p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Button variant={isExpired ? 'outline' : 'error'} onClick={onPrimary}>
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
