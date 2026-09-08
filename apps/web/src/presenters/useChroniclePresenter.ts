import { useState, useMemo, useRef, useEffect } from 'react'
import { useFlavours } from '../models/useFlavours.js'
import { useUploadAudio } from '../models/useUploadAudio.js'
import { useJobPoll, JobExpiredError } from '../models/useJobPoll.js'
import { useGenerateChronicle } from '../models/useGenerateChronicle.js'
import { validateAudioFile } from '../models/validateAudioFile.js'
import type { PipelineStage } from '../views/PipelineStrip.js'

const DEFAULT_FLAVOUR = 'medieval'

type Stage = 'landing' | 'review' | 'processing' | 'result'

export function useChroniclePresenter() {
  const { data: flavours } = useFlavours()

  const [stage, setStage] = useState<Stage>('landing')
  const [selectedFlavour, setSelectedFlavour] = useState<string>(DEFAULT_FLAVOUR)
  const [transcript, setTranscript] = useState('')
  const [micError, setMicError] = useState(false)
  const [uploadValidationError, setUploadValidationError] = useState<
    { code: 'too-large' | 'unsupported-format'; detail: string } | null
  >(null)

  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [uploadNoticeDismissed, setUploadNoticeDismissed] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setUploadNoticeDismissed(false)
    const check = validateAudioFile(file)
    if (!check.ok) {
      setUploadValidationError({ code: check.code, detail: check.detail })
      return
    }
    setUploadValidationError(null)
    uploadMutation.mutate(file, { onSuccess: ({ jobId }) => setUploadJobId(jobId) })
  }

  useEffect(() => {
    if (!isRecording) {
      setElapsed(0)
      return
    }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [isRecording])

  async function startRecording() {
    setUploadNoticeDismissed(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const mimeType = recorder.mimeType || 'audio/webm'
        const ext = mimeType.split('/')[1].split(';')[0]
        const blob = new Blob(chunksRef.current, { type: mimeType })
        tryUploadAudio(new File([blob], `recording.${ext}`, { type: mimeType }))
        setIsRecording(false)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      setMicError(true)
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
  }

  function openFilePicker() {
    setUploadNoticeDismissed(false)
    fileInputRef.current?.click()
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
  // A failure stays on Processing so the shell's PipelineStrip keeps rendering its
  // per-stage failure row and retry button.
  if (jobOutcome === 'expired' && stage !== 'result') setStage('result')
  if (generatePoll.data?.status === 'completed' && stage !== 'result') setStage('result')

  function resetToLanding() {
    setStage('landing')
    setTranscript('')
    setUploadJobId(null)
    setSeededJobId(null)
    setGenerateJobId(null)
    setUploadValidationError(null)
    setUploadNoticeDismissed(false)
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

  const uploadError = uploadPoll.data?.error ?? null

  const notice = uploadValidationError
    ? uploadValidationError.code === 'too-large'
      ? {
          title: 'That file is too large',
          body: 'Chronicler takes recordings up to 25 MB — around 25 minutes of speech. Trim the file, or record directly in the browser instead.',
          detail: uploadValidationError.detail,
        }
      : {
          title: "That format isn't supported",
          body: 'Chronicler reads webm, mp3, m4a, wav and ogg. Convert the file, or record directly in the browser instead.',
          detail: uploadValidationError.detail,
        }
    : uploadStatus === 'error'
      ? {
          title: "That recording couldn't be transcribed",
          body: 'Something went wrong turning your recording into text. Try uploading it again, or record a new one.',
          detail: uploadError ?? 'unknown error',
        }
      : null

  const uploadNotice = !micError && !uploadNoticeDismissed ? notice : null

  function clearUploadError() {
    setUploadNoticeDismissed(true)
    setUploadValidationError(null)
  }

  const elapsedLabel = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`

  return {
    flavours,
    selectedFlavour,
    selectFlavour: setSelectedFlavour,
    transcript,
    setTranscript,
    stage,
    micError,
    clearMicError: () => setMicError(false),
    tryUploadAudio,
    uploadValidationError,
    uploadNotice,
    clearUploadError,
    isRecording,
    elapsedLabel,
    startRecording,
    stopRecording,
    openFilePicker,
    fileInputRef,
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
