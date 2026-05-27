'use client'

import type { ButtonHTMLAttributes } from 'react'
import { useFormStatus } from 'react-dom'

type PendingActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingText: string
}

export function PendingActionButton({
  children,
  disabled,
  pendingText,
  type = 'submit',
  ...props
}: PendingActionButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending ? pendingText : children}
    </button>
  )
}
