import { Card } from '@/components/ui/card.js'
import { NarratorCarousel } from './NarratorCarousel.js'

const SAMPLE_CHRONICLE = `Here follows the chronicle of the Siege of the Flatpack Throne, as testified before this scribe by Marco and Júlia.

On a Saturday eve, the two companions undertook a quest of no small peril: the assembly of a bookshelf delivered in a box of cardboard, its instructions rendered in a tongue neither could decipher. Marco, ever bold, seized the Allen key as a knight seizes his sword and declared the battle begun.

Three hours did the siege endure. Twice was a shelf mounted backward and twice undone. Júlia, keeper of patience, discovered at the eleventh hour that an entire bag of fasteners had been overlooked — a revelation that nearly ended the fellowship there and then. Yet triumph came at last: the throne stood upright, bearing its full weight of books without complaint, and the companions toasted their victory with cold pizza, as is tradition among those who have suffered together.

Let it be remembered: no furniture was harmed beyond repair, and the friendship, like the bookshelf, held.`

interface FlavourSummary {
  key: string
  name: string
  description: string
}

export function LandingView({
  flavours,
  selectedFlavour,
  selectFlavour,
}: {
  flavours: FlavourSummary[]
  selectedFlavour: string | null
  selectFlavour: (key: string) => void
}) {
  return (
    <div className="bg-abyss pb-[60px]">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <NarratorCarousel flavours={flavours} selectedFlavour={selectedFlavour} selectFlavour={selectFlavour} />
      </div>

      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <Card className="p-7" id="how-it-works">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[.14em] text-fg-faint">A story, told</div>
          <div className="whitespace-pre-wrap text-[15px] leading-[1.8] text-fg-dim">{SAMPLE_CHRONICLE}</div>
        </Card>
      </div>
    </div>
  )
}
