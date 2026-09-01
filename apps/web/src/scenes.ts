import type { FlavourKey } from './theme.js'

export interface Shape {
  l: string; t: string; w: string; h: string
  bg: string; r: string; sh: string; tf: string; o: string; fl: string
}

const DEFAULT_SHAPE: Shape = { l: '0px', t: '0px', w: '10px', h: '10px', bg: 'transparent', r: '0', sh: 'none', tf: 'none', o: '1', fl: 'none' }

export function buildScene(key: FlavourKey): Shape[] {
  const S: Shape[] = []
  const sh = (o: Partial<Shape>) => S.push({ ...DEFAULT_SHAPE, ...o })

  if (key === 'fantasy') {
    const shades = ['#1e2029', '#23252f', '#191b23', '#212330']
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 10; col++) {
        sh({ l: (col * 100 - (row % 2 ? 50 : 0)) + 'px', t: (row * 48) + 'px', w: '96px', h: '44px', bg: shades[(row + col) % 4], r: '2px', sh: 'inset 0 -2px 4px rgba(0,0,0,.55)' })
      }
    }
    sh({ l: '552px', t: '46px', w: '192px', h: '254px', bg: '#0b0c11', r: '96px 96px 4px 4px', sh: 'inset 0 0 70px rgba(0,0,0,.95), 0 0 30px rgba(0,0,0,.7)' })
    sh({ l: '564px', t: '58px', w: '168px', h: '242px', bg: 'none', r: '84px 84px 3px 3px', sh: 'inset 0 0 0 1px rgba(233,233,237,.07)' })
    ;([[468, 140], [790, 128]] as const).forEach(([x, g]) => {
      sh({ l: (x - g / 2 + 5) + 'px', t: (100 - g / 2) + 'px', w: g + 'px', h: g + 'px', bg: 'radial-gradient(circle, rgba(255,168,74,.36), transparent 66%)', r: '50%' })
      sh({ l: x + 'px', t: '96px', w: '10px', h: '30px', bg: '#15161d', r: '2px' })
      sh({ l: (x - 3) + 'px', t: '72px', w: '16px', h: '28px', bg: 'radial-gradient(ellipse at 50% 70%, #ffd79a, #ff9a3c 55%, transparent 72%)', r: '50% 50% 40% 40%' })
    })
    sh({ l: '0px', t: '252px', w: '900px', h: '48px', bg: 'linear-gradient(180deg, #14151c, #0d0e13)' })
    for (let i = 0; i < 7; i++) sh({ l: (i * 130 - 40) + 'px', t: '252px', w: '1px', h: '48px', bg: 'rgba(0,0,0,.7)', tf: 'skewX(' + ((i - 3) * 7) + 'deg)' })
    sh({ l: '0px', t: '0px', w: '900px', h: '300px', bg: 'radial-gradient(60% 60% at 50% 40%, transparent 20%, rgba(0,0,0,.72))' })
  }

  if (key === 'nature') {
    sh({ l: '0px', t: '0px', w: '900px', h: '300px', bg: 'linear-gradient(180deg, #0c1712 0%, #0a1310 55%, #070f0c 100%)' })
    ;([[80, 210, 34], [300, 250, 26], [500, 190, 40], [790, 230, 30]] as const).forEach(([x, y, w]) => {
      sh({ l: x + 'px', t: '0px', w: '6px', h: y + 'px', bg: 'rgba(32,78,54,.95)', r: '3px' })
      for (let i = 1; i <= 3; i++) {
        const ly = y * i / 4
        sh({ l: (x - w / 2) + 'px', t: ly + 'px', w: (w + 18) + 'px', h: '22px', bg: '#1c4630', r: '50%', tf: 'rotate(' + (i % 2 ? -20 : 16) + 'deg)' })
        sh({ l: (x - w / 2 + 8) + 'px', t: (ly + 12) + 'px', w: (w + 4) + 'px', h: '18px', bg: '#153a28', r: '50%', tf: 'rotate(' + (i % 2 ? 22 : -14) + 'deg)' })
      }
    })
    for (let i = 0; i < 16; i++) {
      const w = 90 + (i * 37) % 120, x = (i * 121) % 880 - 30, t = -12 + (i % 4) * 18
      sh({ l: x + 'px', t: t + 'px', w: w + 'px', h: (w * 0.62) + 'px', bg: i % 3 === 0 ? '#1c4630' : '#153a28', r: '50%', fl: i % 3 === 0 ? 'blur(3px)' : 'none' })
    }
    ;([[120, 26], [420, 34], [690, 22]] as const).forEach(([x, w]) => {
      sh({ l: x + 'px', t: '0px', w: w + 'px', h: '300px', bg: 'linear-gradient(180deg, rgba(214,255,226,.20), transparent 78%)', tf: 'skewX(-14deg)', fl: 'blur(2px)' })
    })
    for (let i = 0; i < 10; i++) {
      const w = 70 + (i * 53) % 110
      sh({ l: ((i * 97) % 880 - 20) + 'px', t: (250 - (i % 3) * 12) + 'px', w: w + 'px', h: (w * 0.5) + 'px', bg: '#143524', r: '50%', fl: i % 2 ? 'blur(2px)' : 'none' })
    }
    sh({ l: '0px', t: '196px', w: '900px', h: '104px', bg: 'linear-gradient(180deg, transparent, rgba(150,210,180,.10) 60%, rgba(120,190,160,.14))', fl: 'blur(6px)' })
    sh({ l: '0px', t: '0px', w: '900px', h: '300px', bg: 'radial-gradient(70% 65% at 46% 44%, transparent 22%, rgba(0,0,0,.6))' })
  }

  if (key === 'medieval') {
    sh({ l: '0px', t: '0px', w: '900px', h: '300px', bg: 'linear-gradient(180deg, #201b22 0%, #171420 60%, #120f18 100%)' })
    for (let row = 0; row < 5; row++) for (let col = 0; col < 8; col++) sh({ l: (col * 118 - (row % 2 ? 59 : 0)) + 'px', t: (row * 64) + 'px', w: '114px', h: '60px', bg: row % 2 ? '#232029' : '#262230', r: '2px', o: '.5', sh: 'inset 0 -2px 5px rgba(0,0,0,.5)' })
    sh({ l: '556px', t: '-46px', w: '184px', h: '250px', bg: '#0e0c14', r: '92px 92px 4px 4px', sh: 'inset 0 0 50px rgba(0,0,0,.9)' })
    sh({ l: '570px', t: '-34px', w: '156px', h: '236px', bg: 'linear-gradient(180deg, rgba(255,226,170,.18), transparent 70%)', r: '78px 78px 3px 3px' })
    sh({ l: '0px', t: '246px', w: '900px', h: '54px', bg: 'linear-gradient(180deg, rgba(240,228,200,.16), rgba(240,228,200,.06))', sh: '0 -12px 30px rgba(0,0,0,.55)' })
    for (let i = 0; i < 4; i++) sh({ l: '40px', t: (258 + i * 12) + 'px', w: '760px', h: '1px', bg: 'rgba(60,44,24,.28)' })
    sh({ l: '392px', t: '30px', w: '200px', h: '200px', bg: 'radial-gradient(circle, rgba(255,196,116,.34), transparent 66%)', r: '50%' })
    sh({ l: '484px', t: '156px', w: '16px', h: '92px', bg: 'linear-gradient(180deg, #e6dcc4, #b9ac90)', r: '3px' })
    sh({ l: '474px', t: '240px', w: '36px', h: '11px', bg: '#8d8069', r: '50%' })
    sh({ l: '485px', t: '130px', w: '14px', h: '30px', bg: 'radial-gradient(ellipse at 50% 72%, #fff3d0, #ffb545 52%, transparent 74%)', r: '50% 50% 42% 42%' })
    sh({ l: '0px', t: '0px', w: '900px', h: '300px', bg: 'radial-gradient(66% 62% at 30% 46%, transparent 18%, rgba(0,0,0,.74))' })
  }

  if (key === 'sports') {
    sh({ l: '0px', t: '0px', w: '900px', h: '300px', bg: 'linear-gradient(180deg, #16171f 0%, #131420 62%, #0f1018 100%)' })
    for (let row = 0; row < 5; row++) for (let col = 0; col < 30; col++) sh({ l: (col * 30 + (row % 2 ? 14 : 0)) + 'px', t: (66 + row * 17) + 'px', w: '9px', h: '9px', bg: ['#3a3d4c', '#4b4557', '#343747', '#565064'][(row + col) % 4], r: '50%', o: '.85' })
    sh({ l: '0px', t: '58px', w: '900px', h: '100px', bg: 'linear-gradient(180deg, rgba(0,0,0,.5), transparent)' })
    ;([452, 748] as const).forEach((x) => {
      sh({ l: (x + 26) + 'px', t: '24px', w: '5px', h: '46px', bg: '#2b2e3a' })
      sh({ l: x + 'px', t: '6px', w: '58px', h: '22px', bg: '#1c1e28', r: '3px', sh: '0 0 26px rgba(255,248,230,.35)' })
      for (let i = 0; i < 6; i++) sh({ l: (x + 4 + (i % 3) * 18) + 'px', t: (10 + Math.floor(i / 3) * 8) + 'px', w: '14px', h: '6px', bg: '#fff8e2', r: '1px', sh: '0 0 12px rgba(255,248,226,.9)' })
      sh({ l: (x - 22) + 'px', t: '28px', w: '124px', h: '230px', bg: 'linear-gradient(180deg, rgba(255,250,235,.13), transparent 74%)', tf: 'perspective(300px) rotateX(6deg)', fl: 'blur(5px)' })
    })
    for (let i = 0; i < 9; i++) sh({ l: (i * 100) + 'px', t: '214px', w: '100px', h: '86px', bg: i % 2 ? '#1d3324' : '#14241a' })
    sh({ l: '40px', t: '214px', w: '760px', h: '3px', bg: 'linear-gradient(90deg, transparent, rgba(233,233,237,.5) 12%, rgba(233,233,237,.5) 88%, transparent)' })
    sh({ l: '40px', t: '288px', w: '760px', h: '2px', bg: 'linear-gradient(90deg, transparent, rgba(233,233,237,.26) 14%, rgba(233,233,237,.26) 86%, transparent)' })
    sh({ l: '0px', t: '0px', w: '900px', h: '300px', bg: 'radial-gradient(72% 70% at 50% 34%, transparent 26%, rgba(0,0,0,.66))' })
  }

  return S
}
