import { z } from 'zod'

export const emailSchema = z.string().trim().email('Enter a valid email address')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
})

export const signupSchema = z
  .object({
    customerType: z.enum(['land_owner', 'plot_seller', 'plot_buyer'], {
      required_error: 'Choose how you will use PlotKare',
      invalid_type_error: 'Choose how you will use PlotKare',
    }),
    fullName: z
      .string()
      .trim()
      .min(2, 'Enter your full name')
      .max(80, 'Name is too long')
      .regex(/^[A-Za-z][A-Za-z\s.'-]*$/, 'Name can only include letters, spaces, periods, apostrophes, and hyphens'),
    email: emailSchema,
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .max(72, 'Password is too long')
      .regex(/[a-z]/, 'Password needs one lowercase letter')
      .regex(/[A-Z]/, 'Password needs one uppercase letter')
      .regex(/[0-9]/, 'Password needs one number')
      .regex(/[^A-Za-z0-9]/, 'Password needs one special character'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const resetPasswordSchema = z.object({
  email: emailSchema,
})

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
