import { useState, useMemo } from 'react'
import { useFlavours } from '../models/useFlavours.js'
import { useUploadAudio } from '../models/useUploadAudio.js'
import { useJobPoll, JobExpiredError } from '../models/useJobPoll.js'
import { useGenerateChronicle } from '../models/useGenerateChronicle.js'
import { validateAudioFile } from '../models/validateAudioFile.js'

const DEFAULT_FLAVOUR = 'medieval'

type Stage = 'landing' | 'review' | 'processing' | 'result'
type PipelineStageStatus = 'done' | 'active' | 'queued' | 'failed' | 'blocked'
interface PipelineStage { key: 'transcribe' | 'rewrite' | 'narrate'; status: PipelineStageStatus; pct: number }

export function useChroniclePresenter() {
  const { data: flavours } = useFlavours()

  const [stage, setStage] = useState<Stage>('landing')
  const [selectedFlavour, setSelectedFlavour] = useState<string>(DEFAULT_FLAVOUR)
  const [transcript, setTranscript] = useState('')
  const [micError, setMicError] = useState(false)
  const [uploadValidationError, setUploadValidationError] = useState<
    { code: 'too-large' | 'unsupported-format'; detail: string } | null
  >(null)

  const uploadMutation = useUploadAudio()
  const [uploadJobId, setUploadJobId] = useState<string | null>(null)
  const uploadPoll = useJobPoll(uploadJobId)

  const generateMutation = useGenerateChronicle()
  const [generateJobId, setGenerateJobId] = useState<string | null>(null)
  const generatePoll = useJobPoll(generateJobId)

  // `result` is a union of both job kinds; narrow by which poll produced it.
  const transcriptionResult =
    uploadPoll.data?.result && 'transcript' in uploadPoll.data.result ? uploadPoll.data.result : undefined
  const chronicleResult =
    generatePoll.data?.result && 'text' in generatePoll.data.result ? generatePoll.data.result : undefined

  const uploadStatus = useMemo(() => {
    if (uploadMutation.isError || uploadPoll.data?.status === 'failed') return 'error' as const
    if (!uploadJobId) return uploadMutation.isPending ? ('uploading' as const) : ('idle' as const)
    if (uploadPoll.data?.status === 'completed') return 'done' as const
    return 'transcribing' as const
  }, [uploadMutation.isError, uploadMutation.isPending, uploadJobId, uploadPoll.data])

  const [seededJobId, setSeededJobId] = useState<string | null>(null)
  if (transcriptionResult && uploadJobId !== seededJobId) {
    setTranscript(transcriptionResult.transcript)
    setSeededJobId(uploadJobId)
    setStage('review')
  }

  function tryUploadAudio(file: File) {
    const check = validateAudioFile(file)
    if (!check.ok) {
      setUploadValidationError({ code: check.code, detail: check.detail })
      return
    }
    setUploadValidationError(null)
    uploadMutation.mutate(file, { onSuccess: ({ jobId }) => setUploadJobId(jobId) })
  }

  function confirmTranscript() {
    if (!transcript.trim()) return
    setStage('processing')
    generateMutation.mutate(
      { transcripts: [{ speaker: 'Narrator', text: transcript.trim() }], flavour: selectedFlavour },
      { onSuccess: ({ jobId }) => setGenerateJobId(jobId) },
    )
  }

  function retryGenerate() {
    confirmTranscript()
  }

  const transcriptionMs = transcriptionResult?.transcriptionMs ?? null
  const generateProgress = generatePoll.data?.progress ?? 0
  const generateFailed = generatePoll.data?.status === 'failed' || generateMutation.isError
  const rewriteDone = generateProgress >= 60 || generatePoll.data?.status === 'completed'
  const rewriteFailed = generateFailed && generateProgress < 60
  const narrateFailed = generateFailed && generateProgress >= 60

  const stages: PipelineStage[] = [
    { key: 'transcribe', status: 'done', pct: 100 },
    {
      key: 'rewrite',
      status: rewriteFailed ? 'failed' : rewriteDone ? 'done' : 'active',
      pct: rewriteFailed ? generateProgress : rewriteDone ? 100 : generateProgress,
    },
    {
      key: 'narrate',
      status: narrateFailed ? 'failed' : generatePoll.data?.status === 'completed' ? 'done' : rewriteFailed ? 'blocked' : rewriteDone ? 'active' : 'queued',
      pct: narrateFailed ? generateProgress : generatePoll.data?.status === 'completed' ? 100 : 0,
    },
  ]

  const jobOutcome: 'expired' | 'failed' | null =
    generatePoll.error instanceof JobExpiredError ? 'expired' : generateFailed ? 'failed' : null

  // Only an expired job leaves Processing: there is nothing left to render there.
  // A failure stays on Processing so ProcessingView's per-stage failure rows and
  // its retry button remain reachable.
  if (jobOutcome === 'expired' && stage !== 'result') setStage('result')
  if (generatePoll.data?.status === 'completed' && stage !== 'result') setStage('result')

  function resetToLanding() {
    setStage('landing')
    setTranscript('')
    setUploadJobId(null)
    setSeededJobId(null)
    setGenerateJobId(null)
    setUploadValidationError(null)
    setMicError(false)
  }

  function restart() {
    resetToLanding()
    setSelectedFlavour(DEFAULT_FLAVOUR)
  }

  function retellAs(key: string) {
    resetToLanding()
    setSelectedFlavour(key)
  }

  return {
    flavours,
    selectedFlavour,
    selectFlavour: setSelectedFlavour,
    transcript,
    setTranscript,
    stage,
    micError,
    setMicError,
    clearMicError: () => setMicError(false),
    uploadStatus,
    uploadAudio: tryUploadAudio,
    tryUploadAudio,
    uploadValidationError,
    uploadError: uploadPoll.data?.error ?? null,
    confirmTranscript,
    stages,
    retryGenerate,
    transcriptionMs,
    chronicleText: chronicleResult?.text ?? null,
    audioKey: chronicleResult?.audioKey ?? null,
    generateError: generatePoll.data?.error ?? generateMutation.error?.message ?? null,
    jobOutcome,
    restart,
    retellAs,
  }
}
