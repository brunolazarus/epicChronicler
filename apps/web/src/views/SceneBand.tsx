import type { ReactNode } from 'react'
import { buildScene } from '../scenes.js'
import { getFlavourTheme } from '../theme.js'
import type { FlavourKey } from '../theme.js'

export type SceneStage = 'landing' | 'confirm' | 'processing' | 'result'

const BAND_HEIGHT: Record<SceneStage, string> = {
  landing: '420px',
  confirm: '260px',
  processing: '260px',
  result: '128px',
}

export function SceneBand({
  flavourKey,
  stage,
  children,
}: {
  flavourKey: string
  stage: SceneStage
  children?: ReactNode
}) {
  const theme = getFlavourTheme(flavourKey)
  const scene = buildScene(theme.key as FlavourKey)

  return (
    <div
      data-testid="scene-band"
      className="relative mx-auto max-w-[1280px] overflow-hidden"
      style={{ height: BAND_HEIGHT[stage], transition: 'height var(--dur-scene) var(--ease)' }}
    >
      <div className="hidden md:block">
        <div className="pointer-events-none absolute left-1/2 top-[30%] h-[300px] w-[900px] origin-[50%_30%] -translate-x-1/2 -translate-y-[30%] scale-[1.15] lg:scale-[1.4]">
          {scene.map((s, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: s.l,
                top: s.t,
                width: s.w,
                height: s.h,
                background: s.bg,
                borderRadius: s.r,
                boxShadow: s.sh,
                transform: s.tf,
                opacity: s.o,
                filter: s.fl,
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 [background:linear-gradient(90deg,rgba(10,11,16,.88)_0%,rgba(10,11,16,.6)_46%,transparent_72%)]" />
        <div className="absolute inset-0 [background:linear-gradient(180deg,transparent_60%,rgba(22,24,38,.85)_100%)]" />
      </div>

      {children}

      <div className="pointer-events-none absolute bottom-3.5 right-6 hidden text-right font-mono text-[10px] tracking-[.08em] text-fg/50 md:right-12 md:block">
        {theme.sceneLabel}
      </div>
    </div>
  )
}
