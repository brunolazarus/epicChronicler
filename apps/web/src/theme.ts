export type FlavourKey = 'medieval' | 'sports' | 'nature' | 'fantasy'

export interface FlavourTheme {
  key: FlavourKey
  name: string
  short: string
  desc: string
  voice: string
  art: string
  sceneLabel: string
  accent: string
  accentSoft: string
  accentGhost: string
  accentLine: string
}

function mix(accent: string) {
  return {
    accent,
    accentSoft: `color-mix(in srgb, ${accent} 20%, transparent)`,
    accentGhost: `color-mix(in srgb, ${accent} 9%, transparent)`,
    accentLine: `color-mix(in srgb, ${accent} 34%, transparent)`,
  }
}

export const FLAVOUR_THEMES: Record<FlavourKey, FlavourTheme> = {
  medieval: {
    key: 'medieval', name: 'Medieval Chronicler', short: 'Medieval',
    desc: 'A solemn scribe recording events for posterity',
    voice: 'bm_george', art: 'portrait — the scribe',
    sceneLabel: 'the scriptorium — candle, ruled parchment, arched window',
    ...mix('oklch(0.734 0.125 289)'),
  },
  sports: {
    key: 'sports', name: 'Sports Commentator', short: 'Sports',
    desc: 'An energetic play-by-play announcer who sees drama in everything',
    voice: 'am_adam', art: 'portrait — the commentator',
    sceneLabel: 'the stadium — floodlight rigs, crowd tiers, mown pitch',
    ...mix('oklch(0.734 0.135 52)'),
  },
  nature: {
    key: 'nature', name: 'Nature Documentary', short: 'Nature',
    desc: 'A hushed, reverent narrator observing human behaviour in the wild',
    voice: 'bf_emma', art: 'still — the observer',
    sceneLabel: 'the jungle — canopy, vines, light shafts, undergrowth',
    ...mix('oklch(0.734 0.115 158)'),
  },
  fantasy: {
    key: 'fantasy', name: 'Epic Fantasy Bard', short: 'Fantasy',
    desc: 'A legendary storyteller who turns every tale into legend',
    voice: 'af_bella', art: 'portrait — the bard',
    sceneLabel: 'the dungeon — stone courses, wall torches, arched doorway',
    ...mix('oklch(0.734 0.135 344)'),
  },
}

export const FLAVOUR_ORDER: FlavourKey[] = ['medieval', 'sports', 'nature', 'fantasy']

export function getFlavourTheme(key: string): FlavourTheme {
  return FLAVOUR_THEMES[key as FlavourKey] ?? FLAVOUR_THEMES.medieval
}

export function errorPalette(base = 'oklch(0.734 0.155 25)') {
  return {
    base,
    soft: `color-mix(in srgb, ${base} 20%, transparent)`,
    ghost: `color-mix(in srgb, ${base} 9%, transparent)`,
    line: `color-mix(in srgb, ${base} 34%, transparent)`,
    text: 'oklch(0.86 0.09 25)',
  }
}
