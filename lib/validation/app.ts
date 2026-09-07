import { z } from 'zod'

const uuid = z.string().uuid()
const optionalText = z.string().trim().max(240).optional().nullable()
export const safeStructuredText = (min = 0, max = 240) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((value) => !/[;`\u0000-\u001F\u007F]/.test(value), 'Use letters, numbers, and standard punctuation only')

export const humanNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u, 'Use letters, spaces, periods, apostrophes, and hyphens only')

export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .regex(/^[0-9+()\s-]*$/, 'Use digits and phone punctuation only')

const structuredOptionalText = safeStructuredText().optional().nullable()

export const profileUpdateSchema = z.object({
  fullName: humanNameSchema.optional(),
  phone: phoneSchema.optional().nullable(),
  city: structuredOptionalText,
  avatarPath: z.string().trim().min(1).max(500).optional().nullable(),
  notificationPreferences: z.record(z.boolean()).optional(),
})

export const plotCreateSchema = z.object({
  ownerId: uuid.optional(),
  plotNumber: safeStructuredText(1, 80),
  location: safeStructuredText(2, 160),
  locationOther: structuredOptionalText,
  sqYards: z.coerce.number().positive(),
  facing: z.enum(['East', 'West', 'North', 'South']).default('East'),
  cornerPlot: z.coerce.boolean().default(false),
  purchasePriceLakhs: z.coerce.number().min(0).default(0),
  currentValueLakhs: z.coerce.number().min(0).default(0),
  purchaseDate: z.string().trim().optional().nullable(),
})

export const plotUpdateSchema = plotCreateSchema.partial()

export const inspectionReportSchema = z.object({
  ownerId: uuid,
  plotId: uuid.optional().nullable(),
  month: z.string().trim().min(3).max(80),
  agentName: optionalText,
  finding: z.string().trim().min(3).max(3000),
  status: z.enum(['Draft', 'Scheduled', 'Completed', 'Action Needed']).default('Draft'),
  reportFilePath: optionalText,
})

export const inspectionUploadSchema = z.object({
  ownerId: uuid.optional(),
  plotId: uuid,
  reportId: uuid.optional().nullable(),
  fileName: z.string().trim().min(3).max(180),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  sizeBytes: z.coerce.number().int().positive().max(52_428_800).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  capturedAt: z.string().datetime().optional(),
  caption: optionalText,
})

export const documentMetadataSchema = z.object({
  ownerId: uuid.optional(),
  plotId: uuid.optional().nullable(),
  title: safeStructuredText(2, 160),
  bucket: z.enum(['documents', 'inspection-reports']).default('documents'),
  objectPath: z.string().trim().min(3).max(500),
  mimeType: optionalText,
  sizeBytes: z.coerce.number().int().positive().optional(),
})

export const documentUploadSchema = z.object({
  ownerId: uuid.optional(),
  plotId: uuid.optional().nullable(),
  title: safeStructuredText(2, 160),
  bucket: z.enum(['documents', 'inspection-reports']).default('documents'),
  fileName: z.string().trim().min(3).max(180),
  contentType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  sizeBytes: z.coerce.number().int().positive().max(52_428_800).optional(),
})

export const listingSchema = z.object({
  ownerId: uuid.optional().nullable(),
  plotId: uuid.optional().nullable(),
  plotNumber: safeStructuredText(1, 80),
  location: safeStructuredText(2, 160),
  sizeSqYards: z.coerce.number().min(0).default(0),
  sizeLabel: safeStructuredText(1, 80),
  facing: z.enum(['East', 'West', 'North', 'South']).default('East'),
  cornerPlot: z.coerce.boolean().default(false),
  premium: z.coerce.boolean().default(false),
  priceLakhs: z.coerce.number().min(0).default(0),
  priceDisplay: z.string().trim().default('Consult after verification'),
  imagePath: optionalText,
  status: z.enum(['Active', 'Sold', 'featured', 'archived']).default('Active'),
  propertyKind: z.enum(['plot', 'apartment']).default('plot'),
  bhk: z.coerce.number().int().positive().optional().nullable(),
  floorLabel: structuredOptionalText,
})

export const amenitySchema = z.object({
  id: z.string().trim().min(2).max(80),
  name: safeStructuredText(2, 120),
  category: safeStructuredText(2, 80),
  kind: safeStructuredText(2, 80),
  amount: z.coerce.number().min(0).default(0),
  imagePath: optionalText,
  active: z.coerce.boolean().default(true),
})

export const activeAmenitySchema = z.object({
  ownerId: uuid.optional(),
  plotId: uuid.optional().nullable(),
  amenityId: z.string().trim().min(2).max(80),
})

export const supportMessageSchema = z.object({
  name: humanNameSchema,
  email: z.string().trim().email().max(180),
  phone: phoneSchema.optional().nullable(),
  topic: safeStructuredText(2, 120),
  message: z.string().trim().min(10).max(4000),
})
