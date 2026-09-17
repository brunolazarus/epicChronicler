import { useState } from 'react'
import { Card } from '@/components/ui/card.js'
import { getFlavourTheme } from '../../theme.js'
import type { Flavour } from '../../models/useFlavours.js'
import { FlavourChips } from '../FlavourChips.js'
import { ConfirmHeader } from './ConfirmHeader.js'
import { TranscriptPanel } from './TranscriptPanel.js'
import { ActionBar } from './ActionBar.js'

export function ConfirmView({
  transcript, setTranscript, confirmTranscript, selectedFlavour, selectFlavour, flavours, recordingLabel, wordCount, markerRef,
}: {
  transcript: string
  setTranscript: (text: string) => void
  confirmTranscript: () => void
  selectedFlavour: string
  selectFlavour: (key: string) => void
  flavours: Flavour[]
  recordingLabel: string | null
  wordCount: number
  markerRef?: React.Ref<HTMLDivElement>
}) {
  const [editing, setEditing] = useState(false)
  const [snapshot, setSnapshot] = useState('')
  const theme = getFlavourTheme(selectedFlavour)

  function startEditing() {
    setSnapshot(transcript)
    setEditing(true)
  }

  function discard() {
    setTranscript(snapshot)
    setEditing(false)
  }

  return (
    <div className="mx-auto mb-16 max-w-[760px] px-6 md:mb-20 md:px-12">
      <Card className="overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,.45)]">
        <ConfirmHeader markerRef={markerRef} />

        <div className="bg-panel px-[22px] pb-[22px] pt-5">
          <p className="mb-4 max-w-[480px] text-[13.5px] leading-[1.65] text-fg-soft">
            This is what we heard. Fix any names or places we got wrong — the narrator works from this
            text, so a wrong name stays wrong in the legend.
          </p>

          <TranscriptPanel
            editing={editing}
            startEditing={startEditing}
            transcript={transcript}
            setTranscript={setTranscript}
            recordingLabel={recordingLabel}
            wordCount={wordCount}
          />

          <div className="mt-[18px]">
            <FlavourChips
              label="Narrate as"
              flavours={flavours}
              selectedFlavour={selectedFlavour}
              onSelect={selectFlavour}
              testIdPrefix="confirm-flavour"
            />
          </div>

          <ActionBar
            confirmTranscript={confirmTranscript}
            transcript={transcript}
            flavourName={theme.name}
            editing={editing}
            setEditing={setEditing}
            discard={discard}
          />
        </div>
      </Card>
    </div>
  )
}
