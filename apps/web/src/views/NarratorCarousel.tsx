import { useRef } from 'react'
import { Button } from '@/components/ui/button.js'
import { getFlavourTheme } from '../theme.js'

interface FlavourSummary {
  key: string
  name: string
  description: string
}

export function NarratorCarousel({ flavours, selectedFlavour, selectFlavour }: {
  flavours: FlavourSummary[]
  selectedFlavour: string | null
  selectFlavour: (key: string) => void
}) {
  const activeIndex = Math.max(0, flavours.findIndex((f) => f.key === selectedFlavour))
  const current = flavours[activeIndex]
  const prev = () => selectFlavour(flavours[(activeIndex - 1 + flavours.length) % flavours.length].key)
  const next = () => selectFlavour(flavours[(activeIndex + 1) % flavours.length].key)

  const downX = useRef<number | null>(null)
  const swiped = useRef(false)
  const onPointerDown = (e: React.PointerEvent) => { downX.current = e.clientX }
  const onPointerUp = (e: React.PointerEvent) => {
    if (downX.current === null) return
    const dx = e.clientX - downX.current
    downX.current = null
    if (Math.abs(dx) <= 40) return
    swiped.current = true
    if (dx > 0) prev()
    else next()
  }

  const onCardClick = (key: string) => {
    if (swiped.current) {
      swiped.current = false
      return
    }
    selectFlavour(key)
  }

  return (
    <div className="relative overflow-hidden pt-[34px] pb-11">
      <div
        className="pointer-events-none absolute -bottom-60 left-1/2 h-[500px] w-[min(1000px,140vw)] -translate-x-1/2 rounded-full transition-[background] duration-500"
        style={{ background: 'radial-gradient(ellipse at center, var(--accent-soft) 0%, transparent 66%)' }}
      />
      <div className="relative px-6 md:px-12">
        <div className="mb-4 flex items-baseline justify-between">
          <div className="font-mono text-[11px] uppercase tracking-[.14em] text-fg-faint">Narrator</div>
          <div className="text-xs text-fg-soft">{current?.name ?? ''}</div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" aria-label="Previous narrator" onClick={prev} className="shrink-0 border-line-muted text-fg-soft">‹</Button>

          <div
            className="flex-1 overflow-hidden py-2.5"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { downX.current = null }}
          >
            <div
              className={[
                'flex gap-[18px]',
                '[--card-w:160px] [--card-step:178px]',
                'sm:[--card-w:176px] sm:[--card-step:194px]',
                'md:[--card-w:258px] md:[--card-step:276px]',
                'transition-transform duration-[450ms] ease-[cubic-bezier(.22,.8,.26,1)] motion-reduce:transition-none',
              ].join(' ')}
              style={{
                transform: `translateX(calc(50% - var(--card-w) / 2 - ${activeIndex} * var(--card-step)))`,
              }}
            >
              {flavours.map((f) => {
                const selected = f.key === selectedFlavour
                return (
                  <div
                    key={f.key}
                    data-testid={`carousel-chip-${f.key}`}
                    data-flavour={f.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => onCardClick(f.key)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectFlavour(f.key) } }}
                    className={[
                      'w-40 sm:w-44 md:w-[258px] shrink-0 cursor-pointer rounded-xl p-5',
                      'transition-all duration-[450ms] ease-[cubic-bezier(.22,.8,.26,1)] motion-reduce:transition-none',
                      selected
                        ? 'scale-100 opacity-100 border border-accent bg-accent-ghost shadow-[0_0_44px_var(--accent-soft)]'
                        : 'scale-90 opacity-50 border border-line-muted bg-transparent',
                    ].join(' ')}
                  >
                    <div className="mb-4 flex h-24 items-center justify-center rounded-lg border border-dashed border-line-muted [background-image:repeating-linear-gradient(45deg,rgba(233,233,237,.05)_0_5px,transparent_5px_10px)]">
                      <span className="font-mono text-[9px] tracking-[.06em] text-fg-muted">{getFlavourTheme(f.key).art}</span>
                    </div>
                    <div className={`mb-[7px] text-base font-medium leading-tight ${selected ? 'text-fg' : 'text-fg-muted'}`}>{f.name}</div>
                    <div className="min-h-[35px] text-xs leading-[1.45] text-fg-muted">{f.description}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <Button variant="outline" size="icon" aria-label="Next narrator" onClick={next} className="shrink-0 border-line-muted text-fg-soft">›</Button>
        </div>

        <div className="mt-5 flex justify-center gap-1.5">
          {flavours.map((f, i) => (
            <div
              key={f.key}
              className={`h-1.5 rounded-full transition-all duration-[350ms] motion-reduce:transition-none ${i === activeIndex ? 'w-[22px] bg-accent' : 'w-1.5 bg-line-muted'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
