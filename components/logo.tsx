import React from 'react'

type LogoMarkProps = {
  variant?: 'default' | 'light'
}

type LogoMonogramProps = {
  variant?: 'default' | 'light'
  size?: number
}

function LogoMonogram({ variant = 'default', size = 44 }: LogoMonogramProps) {
  const cutout = variant === 'light' ? '#0F0F0F' : '#FFFFFF'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <g
        fontSize="96"
        fontWeight="500"
        style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
      >
        <text x="35" y="85" fill="#8B1538">
          K
        </text>
        <text
          x="8"
          y="85"
          fill="#8B1538"
          stroke={cutout}
          strokeWidth="6"
          paintOrder="stroke fill"
          strokeLinejoin="round"
        >
          P
        </text>
        <circle cx="82" cy="80" r="4" fill="#C9A962" />
      </g>
    </svg>
  )
}

export function LogoMark({ variant = 'default' }: LogoMarkProps) {
  const titleClass =
    variant === 'light'
      ? 'font-serif text-[22px] font-semibold leading-[0.85] tracking-[0.08em] text-white'
      : 'font-serif text-[22px] font-semibold leading-[0.85] tracking-[0.08em] text-primary'
  const subtitleClass =
    variant === 'light'
      ? 'font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-white/70'
      : 'font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-foreground/65'

  return (
    <div
      className="flex items-center gap-3"
      role="img"
      aria-label="PlotKare — Asset management services"
      data-testid="plotkare-logo"
    >
      <LogoMonogram variant={variant} />

      <div className="flex min-w-0 flex-col justify-center gap-1">
        <span className={titleClass}>PLOTKARE</span>
        <span className={subtitleClass}>ASSET MANAGEMENT SERVICES</span>
      </div>
    </div>
  )
}

export function LogoMarkSmall() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="PlotKare logo"
    >
      <g
        fontSize="96"
        fontWeight="500"
        style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
      >
        <text x="35" y="85" fill="#8B1538">
          K
        </text>
        <text
          x="8"
          y="85"
          fill="#8B1538"
          stroke="#FFFFFF"
          strokeWidth="6"
          paintOrder="stroke fill"
          strokeLinejoin="round"
        >
          P
        </text>
        <circle cx="82" cy="80" r="4" fill="#C9A962" />
      </g>
    </svg>
  )
}
