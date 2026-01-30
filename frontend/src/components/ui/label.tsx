import { forwardRef } from 'react'
import { Label as BaseLabel } from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

const Label = forwardRef<
  React.ElementRef<typeof BaseLabel>,
  React.ComponentPropsWithoutRef<typeof BaseLabel>
>(({ className, ...props }, ref) => (
  <BaseLabel
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className
    )}
    {...props}
  />
))
Label.displayName = 'Label'

export { Label }
