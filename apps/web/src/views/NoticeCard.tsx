import { Button } from '@/components/ui/button.js'

function WarningIcon() {
  return (
    <svg
      width={18} height={18} viewBox="0 0 256 256" fill="none"
      stroke="currentColor" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round"
      className="block shrink-0"
    >
      <circle cx={128} cy={128} r={96} />
      <line x1={128} y1={76} x2={128} y2={140} />
      <circle cx={128} cy={176} r={8} fill="currentColor" stroke="none" />
    </svg>
  )
}

export function NoticeCard({ title, body, detail, onPrimary, primaryLabel, onSecondary, secondaryLabel }: {
  title: string
  body: string
  detail: string
  onPrimary: () => void
  primaryLabel: string
  onSecondary: () => void
  secondaryLabel: string
}) {
  return (
    <div className="w-full max-w-full overflow-hidden rounded-lg border border-error-line bg-panel">
      <div className="h-0.5 bg-gradient-to-r from-error to-transparent" />
      <div className="flex items-start gap-[14px] px-5 py-4">
        <div className="mt-px flex shrink-0 text-error [filter:drop-shadow(0_0_8px_var(--error-soft))]">
          <WarningIcon />
        </div>
        <div className="flex-1">
          <div className="mb-[7px] text-sm font-medium text-error-fg">{title}</div>
          <p className="mb-2.5 max-w-[620px] text-[13px] leading-[1.65] text-fg-soft">{body}</p>
          <div className="mb-[14px] flex items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-[9px] font-mono text-[11.5px] text-error-fg">
            {detail}
          </div>
          <div className="flex gap-2">
            <Button variant="error" size="sm" onClick={onPrimary}>
              {primaryLabel}
            </Button>
            <Button variant="ghost" size="sm" onClick={onSecondary}>{secondaryLabel}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
