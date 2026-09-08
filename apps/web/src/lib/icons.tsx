import {
  MicrophoneSlash,
  UploadSimple,
  WarningCircle,
  ClockCounterClockwise,
  PencilSimple,
  Play,
  Pause,
  type IconProps,
} from '@phosphor-icons/react'

type Props = Pick<IconProps, 'size' | 'weight' | 'className'>

const defaults = { size: 18, weight: 'regular' } as const

export const MicrophoneSlashIcon = (p: Props) => <MicrophoneSlash {...defaults} {...p} />
export const UploadSimpleIcon = (p: Props) => <UploadSimple {...defaults} {...p} />
export const WarningCircleIcon = (p: Props) => <WarningCircle {...defaults} {...p} />
export const ClockCounterClockwiseIcon = (p: Props) => <ClockCounterClockwise {...defaults} {...p} />
export const PencilSimpleIcon = (p: Props) => <PencilSimple {...defaults} {...p} />
export const PlayIcon = (p: Props) => <Play {...defaults} weight="fill" {...p} />
export const PauseIcon = (p: Props) => <Pause {...defaults} weight="fill" {...p} />
