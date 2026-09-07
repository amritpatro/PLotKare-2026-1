import { z } from 'zod'
import { safeStructuredText } from './app'

export const plotSchema = z.object({
  plotNumber: safeStructuredText(2, 80).refine(Boolean, 'Plot number is required'),
  location: safeStructuredText(2, 160).refine(Boolean, 'Location is required'),
  locationOther: safeStructuredText(0, 160).optional(),
  sqYards: z.number().positive('Plot size must be greater than 0'),
  facing: z.enum(['East', 'West', 'North', 'South']),
  cornerPlot: z.boolean(),
  purchasePriceLakhs: z.number().min(0),
  currentValueLakhs: z.number().min(0),
  purchaseDate: z.string().optional(),
})
