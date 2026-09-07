import { withBasePath } from '@/lib/site-config'

type SectionWatermarkProps = {
  src: string
  position?: 'left' | 'right' | 'top' | 'bottom'
  scale?: number
  opacity?: number
}

export function SectionWatermark({
  src,
  position = 'right',
  scale = 1.4,
  opacity = 0.08,
}: SectionWatermarkProps) {
  return (
    <div
      aria-hidden="true"
      className={`section-watermark section-watermark--${position}`}
      style={{
        backgroundImage: `url("${withBasePath(src)}")`,
        opacity,
        transform: `scale(${scale})`,
      }}
    />
  )
}
