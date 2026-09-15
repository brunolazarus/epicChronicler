import type { Flavour } from '../../models/useFlavours.js'

export function CarouselDots({ flavours, activeIndex, selectFlavour }: {
  flavours: Flavour[]
  activeIndex: number
  selectFlavour: (key: string) => void
}) {
  return (
    <div className="mt-5 flex justify-center gap-1.5">
      {flavours.map((f, i) => (
        <button
          key={f.key}
          data-testid={`carousel-dot-${f.key}`}
          aria-label={`Go to ${f.name}`}
          onClick={() => selectFlavour(f.key)}
          className={`h-1.5 rounded-full transition-all duration-[var(--dur-dots)] motion-reduce:transition-none ${i === activeIndex ? 'w-[22px] bg-accent' : 'w-1.5 bg-line-muted'}`}
        />
      ))}
    </div>
  )
}
