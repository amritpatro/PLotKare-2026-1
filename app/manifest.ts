import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PlotKare Field Inspections',
    short_name: 'PlotKare Field',
    description: 'GPS-verified field inspections for assigned PlotKare properties.',
    start_url: '/agent/',
    scope: '/agent/',
    display: 'standalone',
    background_color: '#F9FAFB',
    theme_color: '#C0392B',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-dark-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
  }
}
