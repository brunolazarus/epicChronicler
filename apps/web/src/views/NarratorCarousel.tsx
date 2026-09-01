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

  return (
    <div style={{ position: 'relative', overflow: 'hidden', padding: '34px 0 44px' }}>
      <div
        data-flavour={selectedFlavour ?? 'medieval'}
        style={{
          position: 'absolute', left: '50%', bottom: -240, width: 1000, height: 500,
          transform: 'translateX(-50%)', borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, var(--accent-soft) 0%, transparent 66%)',
          transition: 'background .5s ease', pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', padding: '0 48px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-fg-faint)' }}>
            Narrator
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--color-fg-soft)' }}>{current?.name ?? ''}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            role="button"
            aria-label="Previous narrator"
            onClick={prev}
            style={{ flex: 'none', width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--color-line-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-fg-soft)', fontSize: 16, cursor: 'pointer' }}
          >
            ‹
          </div>
          <div style={{ flex: 1, overflow: 'hidden', padding: '10px 0' }}>
            <div
              style={{
                display: 'flex', gap: 18,
                transform: `translateX(${200 - activeIndex * 276}px)`,
                transition: 'transform .45s cubic-bezier(.22,.8,.26,1)',
              }}
            >
              {flavours.map((f) => {
                const theme = getFlavourTheme(f.key)
                const selected = f.key === selectedFlavour
                return (
                  <div
                    key={f.key}
                    data-testid={`carousel-chip-${f.key}`}
                    data-flavour={f.key}
                    role="button"
                    onClick={() => selectFlavour(f.key)}
                    style={{
                      flex: 'none', width: 258, padding: 20, borderRadius: 12, cursor: 'pointer',
                      opacity: selected ? 1 : 0.5,
                      transform: selected ? 'scale(1)' : 'scale(.9)',
                      border: selected ? '1px solid var(--accent)' : '1px solid var(--color-line-muted)',
                      backgroundColor: selected ? 'var(--accent-ghost)' : 'transparent',
                      boxShadow: selected ? '0 0 44px var(--accent-soft)' : 'none',
                      transition: 'all .45s cubic-bezier(.22,.8,.26,1)',
                    }}
                  >
                    <div
                      style={{
                        height: 96, marginBottom: 16, borderRadius: 8, border: '1px dashed var(--color-line-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundImage: 'repeating-linear-gradient(45deg, rgba(233,233,237,.05) 0 5px, transparent 5px 10px)',
                      }}
                    >
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.06em', color: 'var(--color-fg-muted)' }}>
                        {theme.art}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 16, lineHeight: 1.2, color: selected ? 'var(--color-fg)' : 'var(--color-fg-muted)', marginBottom: 7 }}>
                      {f.name}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, lineHeight: 1.45, color: 'var(--color-fg-muted)', minHeight: 35 }}>
                      {f.description}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div
            role="button"
            aria-label="Next narrator"
            onClick={next}
            style={{ flex: 'none', width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--color-line-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-fg-soft)', fontSize: 16, cursor: 'pointer' }}
          >
            ›
          </div>
        </div>
        <div data-flavour={selectedFlavour ?? 'medieval'} style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20 }}>
          {flavours.map((f, i) => (
            <div
              key={f.key}
              style={{
                height: 6, borderRadius: 3,
                width: i === activeIndex ? 22 : 6,
                background: i === activeIndex ? 'var(--accent)' : 'var(--color-line-muted)',
                transition: 'all .35s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
