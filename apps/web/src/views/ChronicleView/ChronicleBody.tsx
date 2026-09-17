import type { FlavourTheme } from '../../theme.js'
import type { Flavour } from '../../models/useFlavours.js'
import { FlavourChips } from '../FlavourChips.js'
import { formatTime, stagger } from './format.js'

export function ChronicleBody({ theme, wordCount, duration, leadParas, payoff, flavours, selectedFlavour, retellAs }: {
  theme: FlavourTheme
  wordCount: number
  duration: number
  leadParas: string[]
  payoff: string
  flavours: Flavour[]
  selectedFlavour: string | null
  retellAs: (key: string) => void
}) {
  return (
    <div className="px-6 py-7 md:px-[34px]">
      <div {...stagger(0)} className="stagger-block mb-[22px]">
        <div className="flex items-baseline justify-between gap-4">
          <div className="font-mono text-[10.5px] uppercase tracking-[.16em] text-accent">{theme.name}</div>
          <span className="flex-none font-mono text-[11px] text-fg-muted">
            {duration > 0 ? `${formatTime(duration)} · ${wordCount} words` : `${wordCount} words`}
          </span>
        </div>
        <div className="mt-[11px] h-px bg-[linear-gradient(90deg,var(--accent),transparent)]" />
      </div>

      <div data-testid="chronicle-text">
        <div {...stagger(1)} className="stagger-block flex flex-col gap-4">
          {leadParas.map((para, i) => (
            <p key={i} className="whitespace-pre-wrap text-[15px] leading-[1.8] text-fg-muted">{para}</p>
          ))}
        </div>
        {payoff && (
          <p {...stagger(2)} className="stagger-block mt-4 whitespace-pre-wrap border-l-2 border-accent pl-4 text-[15px] leading-[1.8] text-fg">
            {payoff}
          </p>
        )}
      </div>

      <div className="mt-[26px]">
        <FlavourChips
          label="Tell it again as"
          flavours={flavours}
          selectedFlavour={selectedFlavour}
          onSelect={retellAs}
          testIdPrefix="retell"
        />
      </div>
    </div>
  )
}
