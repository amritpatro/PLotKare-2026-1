import Image from 'next/image'
import { Camera, FileText, Bell } from 'lucide-react'
import { withBasePath } from '@/lib/site-config'

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
        <div className="premium-reveal mb-16 text-center">
          <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
            {heading}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-sans text-lg text-muted-foreground">
            {introduction}
          </p>
        </div>

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
                <div className={`relative overflow-hidden ${index === 0 ? 'aspect-[4/3] lg:aspect-auto lg:h-full' : 'aspect-[16/8]'}`}>
                  <Image
                    src={withBasePath(service.image)}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <div className={`p-7 ${index === 0 ? 'lg:absolute lg:inset-x-0 lg:bottom-0 lg:bg-white/95 lg:backdrop-blur-sm' : ''}`}>
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
            )
          })}
        </div>
      </div>
    </section>
  )
}
