import Image from 'next/image'
import { Camera, FileText, Bell } from 'lucide-react'
import { withBasePath } from '@/lib/site-config'
import { SectionKicker } from '@/components/section-kicker'
import { Reveal } from '@/components/motion/reveal'

const services = [
  {
    icon: Camera,
    image: '/images/amenities/real/boundary-fencing.jpg',
    title: 'Know what changed on site',
    description: 'A visit captures visible boundary, access, and site-condition evidence against the verified plot location.',
  },
  {
    icon: FileText,
    image: '/images/amenities/real/legal-sign-boards.jpg',
    title: 'Keep the property file usable',
    description: 'Documents, inspection notes, and follow-up stay associated with the property instead of scattered across messages.',
  },
  {
    icon: Bell,
    image: '/images/amenities/real/cctv-installation.jpg',
    title: 'Act on a clear next step',
    description: 'A concern can move into review and support with an evidence trail your family or advisor can understand.',
  },
]

export function ServicesSection({
  heading = 'The property record, made visible',
  introduction = 'Three practical layers of confidence for owners managing land from a distance.',
}: {
  heading?: string
  introduction?: string
}) {
  return (
    <section id="services" className="premium-section bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        {/* Header */}
        <Reveal className="mb-16 text-center">
          <SectionKicker label="Property record" />
          <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
            {heading}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-sans text-lg text-muted-foreground">
            {introduction}
          </p>
        </Reveal>

        {/* Services Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <div
                key={index}
                className={`premium-surface premium-interactive group relative overflow-hidden rounded-lg border border-border bg-white ${
                  index === 0 ? 'lg:row-span-2' : ''
                }`}
              >
                <div className={`absolute inset-0 ${index === 0 ? 'min-h-[420px] lg:min-h-[540px]' : 'min-h-[300px]'}`}>
                  <Image
                    src={withBasePath(service.image)}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" aria-hidden />
                <div className={`relative z-[1] flex min-h-[300px] flex-col justify-end p-6 ${index === 0 ? 'min-h-[420px] lg:min-h-[540px]' : ''}`}>
                  <div className="rounded-xl border border-white/30 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mb-3 font-serif text-xl font-semibold text-foreground">
                      {service.title}
                    </h3>
                    <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
