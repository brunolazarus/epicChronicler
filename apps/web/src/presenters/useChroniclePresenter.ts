import { useState, useMemo, useRef, useEffect } from 'react'
import { useFlavours } from '../models/useFlavours.js'
import { useUploadAudio } from '../models/useUploadAudio.js'
import { useJobPoll, JobExpiredError } from '../models/useJobPoll.js'
import { useGenerateChronicle } from '../models/useGenerateChronicle.js'
import { validateAudioFile } from '../models/validateAudioFile.js'
import type { PipelineStage } from '../views/PipelineStrip.js'

const DEFAULT_FLAVOUR = 'medieval'

function formatMSS(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Chromium reports `duration: Infinity` on `loadedmetadata` for a MediaRecorder webm blob
// until more of the stream is read. Seeking past the end forces a `durationchange` with the
// real value. See https://bugs.chromium.org/p/chromium/issues/detail?id=642012.
function captureAudioDuration(probe: HTMLAudioElement, url: string, onDuration: (seconds: number | null) => void) {
  const finish = (seconds: number | null) => {
    onDuration(seconds)
    URL.revokeObjectURL(url)
  }
  probe.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(probe.duration)) {
      finish(Math.round(probe.duration))
      return
    }
    probe.addEventListener(
      'durationchange',
      () => {
        const seconds = Number.isFinite(probe.duration) ? Math.round(probe.duration) : null
        probe.currentTime = 0
        finish(seconds)
      },
      { once: true },
    )
    probe.currentTime = Number.MAX_SAFE_INTEGER
  })
  probe.addEventListener('error', () => finish(null))
}

type Stage = 'landing' | 'review' | 'processing' | 'result'

export function useChroniclePresenter() {
  const { data: flavours } = useFlavours()

  const [stage, setStage] = useState<Stage>('landing')
  const [selectedFlavour, setSelectedFlavour] = useState<string>(DEFAULT_FLAVOUR)
  const [transcript, setTranscript] = useState('')
  const [micError, setMicError] = useState(false)
  const [uploadValidationError, setUploadValidationError] = useState<
    { code: 'too-large' | 'unsupported-format'; fileName: string; value: string; limit: string } | null
  >(null)

  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [recordingSeconds, setRecordingSeconds] = useState<number | null>(null)
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
      setUploadValidationError({ code: check.code, fileName: check.fileName, value: check.value, limit: check.limit })
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

        const url = URL.createObjectURL(blob)
        const probe = new Audio(url)
        captureAudioDuration(probe, url, setRecordingSeconds)

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

  // The rewrite is paid work, so it is held until the user confirms the transcript.
  const stages: PipelineStage[] = stage === 'review' ? [
    { key: 'transcribe', status: 'done', pct: 100 },
    { key: 'rewrite', status: 'held', pct: 0 },
    { key: 'narrate', status: 'queued', pct: 0 },
  ] : [
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
    setRecordingSeconds(null)
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

  const VALIDATION_DETAIL = {
    'too-large': 'ERR_FILE_TOO_LARGE',
    'unsupported-format': 'ERR_UNSUPPORTED_FORMAT',
  } as const

  const notice = uploadValidationError
    ? uploadValidationError.code === 'too-large'
      ? {
          title: 'That file is too large',
          body: 'Chronicler takes recordings up to 25 MB — around 25 minutes of speech. Trim the file, or record directly in the browser instead.',
          detail: VALIDATION_DETAIL[uploadValidationError.code],
          fileName: uploadValidationError.fileName,
          value: uploadValidationError.value,
          limit: uploadValidationError.limit,
        }
      : {
          title: "That format isn't supported",
          body: 'Chronicler reads webm, mp3, m4a, wav and ogg. Convert the file, or record directly in the browser instead.',
          detail: VALIDATION_DETAIL[uploadValidationError.code],
          fileName: uploadValidationError.fileName,
          value: uploadValidationError.value,
          limit: uploadValidationError.limit,
        }
    : uploadStatus === 'error'
      ? {
          title: "That recording couldn't be transcribed",
          body: 'Something went wrong turning your recording into text. Try uploading it again, or record a new one.',
          detail: uploadError ?? 'unknown error',
          fileName: undefined as string | undefined,
          value: undefined as string | undefined,
          limit: undefined as string | undefined,
        }
      : null

  const uploadNotice = !micError && !uploadNoticeDismissed ? notice : null

  function clearUploadError() {
    setUploadNoticeDismissed(true)
    setUploadValidationError(null)
  }

  const elapsedLabel = formatMSS(elapsed)
  const recordingLabel = recordingSeconds == null ? null : `${formatMSS(recordingSeconds)} audio`
  const transcriptWordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0

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
    recordingLabel,
    transcriptWordCount,
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
    jobId: generateJobId ?? uploadJobId ?? null,
  }
}
