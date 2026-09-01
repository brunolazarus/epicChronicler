import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils.js'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        error: 'border border-error bg-error-ghost text-error-fg hover:bg-error-soft',
        outline: 'border border-fg-soft bg-transparent text-fg hover:bg-white/5',
        ghost: 'text-fg-soft hover:text-fg hover:bg-white/5',
      },
      size: {
        default: 'h-auto px-[22px] py-[11px] text-[13.5px]',
        sm: 'px-[14px] py-[7px] text-xs',
        icon: 'h-9 w-9 p-0 text-base',
      },
    },
    defaultVariants: { variant: 'outline', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
