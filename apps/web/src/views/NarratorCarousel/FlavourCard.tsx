import { getFlavourTheme } from '../../theme.js'
import type { Flavour } from '../../models/useFlavours.js'

export function FlavourCard({ flavour, selected, onClick, onSelect }: {
  flavour: Flavour
  selected: boolean
  onClick: () => void
  onSelect: () => void
}) {
  return (
    <div
      data-testid={`carousel-chip-${flavour.key}`}
      data-flavour={flavour.key}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
      className={[
        'w-40 sm:w-44 md:w-[258px] shrink-0 cursor-pointer rounded-xl p-5',
        'transition-all duration-[var(--dur-card)] ease-[cubic-bezier(.22,.8,.26,1)] motion-reduce:transition-none',
        selected
          ? 'scale-100 opacity-100 border border-accent-line bg-accent-ghost shadow-[0_0_44px_var(--accent-soft)]'
          : 'scale-90 opacity-50 border border-line-muted bg-transparent',
      ].join(' ')}
    >
      <div className="mb-4 flex h-24 items-center justify-center rounded-lg border border-dashed border-line-muted [background-image:repeating-linear-gradient(45deg,rgba(233,233,237,.05)_0_5px,transparent_5px_10px)]">
        <span className="font-mono text-[9px] tracking-[.06em] text-fg-muted">{getFlavourTheme(flavour.key).art}</span>
      </div>
      <div className={`mb-[7px] text-base font-medium leading-tight ${selected ? 'text-fg' : 'text-fg-muted'}`}>{flavour.name}</div>
      <div className="min-h-[35px] text-xs leading-[1.45] text-fg-muted">{flavour.description}</div>
    </div>
  )
}
