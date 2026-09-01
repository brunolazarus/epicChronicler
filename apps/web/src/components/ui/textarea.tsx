import { forwardRef } from 'react'
import { cn } from '@/lib/utils.js'

export const Textarea = forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-line bg-surface p-3 font-mono text-[13px] text-fg outline-none',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
