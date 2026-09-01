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
  const currentTheme = current ? getFlavourTheme(current.key) : undefined
  const prev = () => selectFlavour(flavours[(activeIndex - 1 + flavours.length) % flavours.length].key)
  const next = () => selectFlavour(flavours[(activeIndex + 1) % flavours.length].key)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', padding: '34px 0 44px' }}>
      <div
        style={{
          position: 'absolute', left: '50%', bottom: -240, width: 1000, height: 500,
          transform: 'translateX(-50%)', borderRadius: '50%',
          background: `radial-gradient(ellipse at center, ${currentTheme?.accentSoft ?? 'transparent'} 0%, transparent 66%)`,
          transition: 'background .5s ease', pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', padding: '0 48px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#595d6c' }}>
            Narrator
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#b2b6ca' }}>{current?.name ?? ''}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            role="button"
            aria-label="Previous narrator"
            onClick={prev}
            style={{ flex: 'none', width: 36, height: 36, borderRadius: '50%', border: '1px solid #3f424d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b2b6ca', fontSize: 16, cursor: 'pointer' }}
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
                    role="button"
                    onClick={() => selectFlavour(f.key)}
                    style={{
                      flex: 'none', width: 258, padding: 20, borderRadius: 12, cursor: 'pointer',
                      opacity: selected ? 1 : 0.5,
                      transform: selected ? 'scale(1)' : 'scale(.9)',
                      border: selected ? `1px solid ${theme.accent}` : '1px solid #3f424d',
                      backgroundColor: selected ? theme.accentGhost : 'transparent',
                      boxShadow: selected ? `0 0 44px ${theme.accentSoft}` : 'none',
                      transition: 'all .45s cubic-bezier(.22,.8,.26,1)',
                    }}
                  >
                    <div
                      style={{
                        height: 96, marginBottom: 16, borderRadius: 8, border: '1px dashed #3f424d',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundImage: 'repeating-linear-gradient(45deg, rgba(233,233,237,.05) 0 5px, transparent 5px 10px)',
                      }}
                    >
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.06em', color: '#9397ab' }}>
                        {theme.art}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 16, lineHeight: 1.2, color: selected ? '#e9e9ed' : '#9397ab', marginBottom: 7 }}>
                      {f.name}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, lineHeight: 1.45, color: '#9397ab', minHeight: 35 }}>
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
            style={{ flex: 'none', width: 36, height: 36, borderRadius: '50%', border: '1px solid #3f424d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b2b6ca', fontSize: 16, cursor: 'pointer' }}
          >
            ›
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20 }}>
          {flavours.map((f, i) => (
            <div
              key={f.key}
              style={{
                height: 6, borderRadius: 3,
                width: i === activeIndex ? 22 : 6,
                background: i === activeIndex ? currentTheme?.accent ?? '#3f424d' : '#3f424d',
                transition: 'all .35s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
