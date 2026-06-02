import { z } from 'zod'

export const emailSchema = z.string().trim().email('Enter a valid email address')

export function getPasswordRequirementChecks(password: string) {
  return [
    { label: 'At least 12 characters', valid: password.length >= 12 },
    { label: 'At least one uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'At least one number', valid: /[0-9]/.test(password) },
    { label: 'At least one symbol such as ! @ # $ % ^ & *', valid: /[^A-Za-z0-9]/.test(password) },
  ]
}

const strongPasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(72, 'Password is too long')
  .regex(/[a-z]/, 'Password needs one lowercase letter')
  .regex(/[A-Z]/, 'Password needs one uppercase letter')
  .regex(/[0-9]/, 'Password needs one number')
  .regex(/[^A-Za-z0-9]/, 'Password needs one special character')

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
    password: strongPasswordSchema,
    confirmPassword: z.string().min(12, 'Confirm your password'),
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
    password: strongPasswordSchema,
    confirmPassword: z.string().min(12, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
