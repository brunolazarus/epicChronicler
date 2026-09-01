import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoticeCard } from '../NoticeCard.js'

describe('NoticeCard', () => {
  it('renders copy and wires both actions', async () => {
    const onPrimary = vi.fn()
    const onSecondary = vi.fn()
    render(
      <NoticeCard title="That file is too large" body="Limit 25 MB." detail="68.4 MB · limit 25 MB"
        primaryLabel="Choose another file" onPrimary={onPrimary}
        secondaryLabel="Record instead" onSecondary={onSecondary} />,
    )
    expect(screen.getByText('That file is too large')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Choose another file'))
    expect(onPrimary).toHaveBeenCalled()
    await userEvent.click(screen.getByText('Record instead'))
    expect(onSecondary).toHaveBeenCalled()
  })
})
