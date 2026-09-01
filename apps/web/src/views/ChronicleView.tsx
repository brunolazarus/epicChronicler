import { Card } from '@/components/ui/card.js'
import { EmptyStateShell } from './EmptyStateShell.js'
import { getFlavourTheme } from '../theme.js'

interface FlavourSummary { key: string; name: string; description: string }

export function ChronicleView({ chronicleText, audioKey, transcript, flavours, selectedFlavour, retellAs, jobOutcome, restart }: {
  chronicleText: string | null
  audioKey: string | null
  transcript: string
  flavours: FlavourSummary[]
  selectedFlavour: string | null
  retellAs: (key: string) => void
  jobOutcome: 'expired' | 'failed' | null
  restart: () => void
}) {
  if (jobOutcome) {
    return <EmptyStateShell kind={jobOutcome === 'expired' ? 'expired' : 'generic'} jobId="—" onPrimary={restart} />
  }

  const theme = getFlavourTheme(selectedFlavour ?? 'medieval')

  return (
    <div className="mx-auto my-[60px] max-w-[1080px] px-6 md:px-12">
      <Card className="overflow-hidden bg-surface">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr]">
          <div className="border-b border-line bg-panel p-6 md:border-b-0 md:border-r">
            <div className="mb-[18px] font-mono text-[10.5px] uppercase tracking-[.14em] text-fg-faint">What you said</div>
            <div className="whitespace-pre-wrap font-mono text-xs leading-[1.7] text-fg-muted">{transcript}</div>
          </div>
          <div className="px-6 py-7 md:px-[34px]">
            <div className="mb-[11px] font-mono text-[10.5px] uppercase tracking-[.16em] text-accent">{theme.name}</div>
            <div data-testid="chronicle-text" className="whitespace-pre-wrap text-[15px] leading-[1.8] text-fg">
              {chronicleText ?? 'Your chronicle will appear here…'}
            </div>
            {audioKey && (
              <audio data-testid="tts-player" controls src={`/api/v1/pipeline/audio/${audioKey}`} className="mt-5 w-full" />
            )}
            <div className="mt-[26px] flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11.5px] text-fg-muted">Tell it again as</span>
              {flavours.map((f) => {
                const t = getFlavourTheme(f.key)
                const on = f.key === selectedFlavour
                return (
                  <div
                    key={f.key}
                    data-testid={`retell-${f.key}`}
                    data-flavour={f.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => retellAs(f.key)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); retellAs(f.key) } }}
                    className={[
                      'cursor-pointer rounded-full px-[13px] py-[7px] text-xs',
                      on ? 'border border-accent bg-accent-ghost text-fg' : 'border border-line-muted bg-transparent text-fg-muted',
                    ].join(' ')}
                  >
                    {t.short}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
