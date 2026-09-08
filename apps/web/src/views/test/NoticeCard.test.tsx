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

  it('renders the rejected-file strip when file fields are supplied', () => {
    render(<NoticeCard title="That file is too large" body="…" detail="ERR_FILE_TOO_LARGE"
      fileName="night-out-full.m4a" value="68.4 MB" limit="limit 25 MB"
      onPrimary={() => {}} primaryLabel="Choose another file" onSecondary={() => {}} secondaryLabel="Record instead" />)
    expect(screen.getByText('night-out-full.m4a')).toBeInTheDocument()
    expect(screen.getByText('68.4 MB')).toBeInTheDocument()
    expect(screen.getByText('limit 25 MB')).toBeInTheDocument()
    expect(screen.getByText('ERR_FILE_TOO_LARGE')).toBeInTheDocument()
  })
})
