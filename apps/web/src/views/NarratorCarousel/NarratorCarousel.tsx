import { useRef } from 'react'
import { Button } from '@/components/ui/button.js'
import type { Flavour } from '../../models/useFlavours.js'
import { CarouselHeader } from './CarouselHeader.js'
import { FlavourCard } from './FlavourCard.js'
import { CarouselDots } from './CarouselDots.js'

export function NarratorCarousel({ flavours, selectedFlavour, selectFlavour }: {
  flavours: Flavour[]
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
        <CarouselHeader currentName={current?.name ?? ''} />

        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" aria-label="Previous narrator" onClick={prev} className="shrink-0 border-line-muted text-fg-soft">‹</Button>

          <div
            className="flex-1 overflow-hidden py-2.5"
            tabIndex={0}
            role="group"
            aria-label="Narrator carousel"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { downX.current = null }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault()
                prev()
              } else if (e.key === 'ArrowRight') {
                e.preventDefault()
                next()
              }
            }}
          >
            <div
              className={[
                'flex gap-[18px]',
                '[--card-w:160px] [--card-step:178px]',
                'sm:[--card-w:176px] sm:[--card-step:194px]',
                'md:[--card-w:258px] md:[--card-step:276px]',
                'transition-transform duration-[var(--dur-card)] ease-[cubic-bezier(.22,.8,.26,1)] motion-reduce:transition-none',
              ].join(' ')}
              style={{
                transform: `translateX(calc(50% - var(--card-w) / 2 - ${activeIndex} * var(--card-step)))`,
              }}
            >
              {flavours.map((f) => (
                <FlavourCard
                  key={f.key}
                  flavour={f}
                  selected={f.key === selectedFlavour}
                  onClick={() => onCardClick(f.key)}
                  onSelect={() => selectFlavour(f.key)}
                />
              ))}
            </div>
          </div>

          <Button variant="outline" size="icon" aria-label="Next narrator" onClick={next} className="shrink-0 border-line-muted text-fg-soft">›</Button>
        </div>

        <CarouselDots flavours={flavours} activeIndex={activeIndex} selectFlavour={selectFlavour} />
      </div>
    </div>
  )
}
