'use client'

type PremiumButtonProps = {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
  className?: string
  'aria-describedby'?: string
}

const variantClasses = {
  primary: 'bg-[#8B1538] text-white hover:bg-[#75112f]',
  secondary: 'border border-[#1a1a1a]/20 bg-white text-[#1a1a1a] hover:border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white',
  ghost: 'h-auto text-[#8B1538] underline-offset-4 hover:text-[#75112f] hover:underline',
}

export function PremiumButton({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  loading,
  disabled,
  fullWidth,
  icon,
  className = '',
  'aria-describedby': ariaDescribedBy,
}: PremiumButtonProps) {
  const isGhost = variant === 'ghost'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-describedby={ariaDescribedBy}
      className={`${fullWidth ? 'w-full' : ''} ${isGhost ? '' : 'h-14 rounded-xl px-5 font-semibold'} inline-flex items-center justify-center gap-2 text-base transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1538] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8F6F3] disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Please wait...
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  )
}
