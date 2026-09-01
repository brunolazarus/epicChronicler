export type FlavourKey = 'medieval' | 'sports' | 'nature' | 'fantasy'

export interface FlavourTheme {
  key: FlavourKey
  name: string
  short: string
  desc: string
  voice: string
  art: string
  sceneLabel: string
}

export const FLAVOUR_THEMES: Record<FlavourKey, FlavourTheme> = {
  medieval: {
    key: 'medieval', name: 'Medieval Chronicler', short: 'Medieval',
    desc: 'A solemn scribe recording events for posterity',
    voice: 'bm_george', art: 'portrait — the scribe',
    sceneLabel: 'the scriptorium — candle, ruled parchment, arched window',
  },
  sports: {
    key: 'sports', name: 'Sports Commentator', short: 'Sports',
    desc: 'An energetic play-by-play announcer who sees drama in everything',
    voice: 'am_adam', art: 'portrait — the commentator',
    sceneLabel: 'the stadium — floodlight rigs, crowd tiers, mown pitch',
  },
  nature: {
    key: 'nature', name: 'Nature Documentary', short: 'Nature',
    desc: 'A hushed, reverent narrator observing human behaviour in the wild',
    voice: 'bf_emma', art: 'still — the observer',
    sceneLabel: 'the jungle — canopy, vines, light shafts, undergrowth',
  },
  fantasy: {
    key: 'fantasy', name: 'Epic Fantasy Bard', short: 'Fantasy',
    desc: 'A legendary storyteller who turns every tale into legend',
    voice: 'af_bella', art: 'portrait — the bard',
    sceneLabel: 'the dungeon — stone courses, wall torches, arched doorway',
  },
}

export const FLAVOUR_ORDER: FlavourKey[] = ['medieval', 'sports', 'nature', 'fantasy']

export function getFlavourTheme(key: string): FlavourTheme {
  return FLAVOUR_THEMES[key as FlavourKey] ?? FLAVOUR_THEMES.medieval
}
