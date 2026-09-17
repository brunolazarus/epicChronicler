import { getFlavourTheme } from '../theme.js'
import type { Flavour } from '../models/useFlavours.js'

export function FlavourChips({ label, flavours, selectedFlavour, onSelect, testIdPrefix }: {
  label: string
  flavours: Flavour[]
  selectedFlavour: string | null
  onSelect: (key: string) => void
  testIdPrefix: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[11.5px] text-fg-muted">{label}</span>
      {flavours.map((f) => {
        const t = getFlavourTheme(f.key)
        const on = f.key === selectedFlavour
        return (
          <div
            key={f.key}
            data-testid={`${testIdPrefix}-${f.key}`}
            data-flavour={f.key}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(f.key)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(f.key) } }}
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
  )
}
