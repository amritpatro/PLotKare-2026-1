import { z } from 'zod'

export const plotSchema = z.object({
  plotNumber: z.string().trim().min(2, 'Plot number is required').max(80),
  location: z.string().trim().min(2, 'Location is required').max(160),
  locationOther: z.string().trim().max(160).optional(),
  sqYards: z.number().positive('Plot size must be greater than 0'),
  facing: z.enum(['East', 'West', 'North', 'South']),
  cornerPlot: z.boolean(),
  purchasePriceLakhs: z.number().min(0),
  currentValueLakhs: z.number().min(0),
  purchaseDate: z.string().optional(),
})
