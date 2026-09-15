import type { CSSProperties } from 'react'

export function countWords(text: string | null) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

export function stagger(index: number) {
  return {
    'data-stagger': index,
    style: { '--stagger-index': index } as CSSProperties,
  }
}
