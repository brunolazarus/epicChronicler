import { useState } from 'react'
import { Card } from '@/components/ui/card.js'
import { EmptyStateShell } from '../EmptyStateShell.js'
import { getFlavourTheme } from '../../theme.js'
import type { Flavour } from '../../models/useFlavours.js'
import { ChronicleHeader } from './ChronicleHeader.js'
import { TranscriptColumn } from './TranscriptColumn.js'
import { ChronicleBody } from './ChronicleBody.js'
import { AudioPlayer } from './AudioPlayer.js'
import { ChronicleFooter } from './ChronicleFooter.js'
import { countWords } from './format.js'

export function ChronicleView({
  chronicleText, audioKey, transcript, flavours, selectedFlavour, retellAs, jobOutcome, restart, retryGenerate, jobId = '—', markerRef,
}: {
  chronicleText: string | null
  audioKey: string | null
  transcript: string
  flavours: Flavour[]
  selectedFlavour: string | null
  retellAs: (key: string) => void
  jobOutcome: 'expired' | 'failed' | null
  restart: () => void
  retryGenerate?: () => void
  jobId?: string
  markerRef?: React.Ref<HTMLDivElement>
}) {
  const [duration, setDuration] = useState(0)

  if (jobOutcome) {
    return (
      <EmptyStateShell
        kind={jobOutcome === 'expired' ? 'expired' : 'generic'}
        jobId={jobId}
        onPrimary={restart}
        onRetry={retryGenerate}
      />
    )
  }

  const theme = getFlavourTheme(selectedFlavour ?? 'medieval')
  const wordCount = countWords(chronicleText)
  // the accent rule is reserved for the closing line, so only the last block is the payoff
  const blocks = chronicleText?.trim() ? chronicleText.trim().split(/\n\s*\n/) : ['Your chronicle will appear here…']
  const payoff = blocks.length > 1 ? blocks[blocks.length - 1] : ''
  const leadParas = blocks.length > 1 ? blocks.slice(0, -1) : blocks
  const playerIndex = payoff ? 3 : 2

  return (
    <div className="mx-auto my-[60px] max-w-[1080px] px-6 md:px-12">
      <Card className="overflow-hidden bg-surface shadow-[0_16px_40px_rgba(0,0,0,.45)]">
        <ChronicleHeader selectedFlavour={selectedFlavour} jobId={jobId} markerRef={markerRef} />

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr]">
          <TranscriptColumn transcript={transcript} />
          <ChronicleBody
            theme={theme}
            wordCount={wordCount}
            duration={duration}
            leadParas={leadParas}
            payoff={payoff}
            flavours={flavours}
            selectedFlavour={selectedFlavour}
            retellAs={retellAs}
          />
        </div>

        {audioKey && <AudioPlayer audioKey={audioKey} staggerIndex={playerIndex} onDurationChange={setDuration} />}
        <ChronicleFooter audioKey={audioKey} onRestart={restart} />
      </Card>
    </div>
  )
}
