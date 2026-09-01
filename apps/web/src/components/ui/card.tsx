import { forwardRef } from 'react'
import { cn } from '@/lib/utils.js'

export const Card = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-card border border-line bg-panel', className)} {...props} />
  ),
)
Card.displayName = 'Card'
