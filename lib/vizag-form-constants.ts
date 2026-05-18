export const VIZAG_LOCATIONS = [
  'Bheemunipatnam Phase 1',
  'Bheemunipatnam Phase 2',
  'Bheemunipatnam Phase 3',
  'Kommadi Layout',
  'Kommadi Extension',
  'Pendurthi Layout',
  'Anakapalle Extension',
  'Anakapalle New Town',
  'MVP Colony',
  'Madhurawada',
  'Rushikonda',
  'Gopalapatnam',
  'Seethammadhara',
  'Other',
] as const

export const SIZE_TILES = [
  '100 sq yards',
  '150 sq yards',
  '200 sq yards',
  '240 sq yards',
  '267 sq yards',
  '300 sq yards',
  '333 sq yards',
  '400 sq yards',
  '500 sq yards',
  '600 sq yards',
  '800 sq yards',
  '1000 sq yards',
  '1200 sq yards',
  '1500 sq yards',
  '2000 sq yards',
  '2400 sq yards',
  '3000 sq yards',
  '4000 sq yards',
  '5000 sq yards',
  'Custom',
] as const

export type VizagLocation = (typeof VIZAG_LOCATIONS)[number]
export type SizeTile = (typeof SIZE_TILES)[number]
