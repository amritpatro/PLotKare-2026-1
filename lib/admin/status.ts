export const ADMIN_ACCOUNT_STATUSES = ['pending', 'active', 'suspended', 'closed'] as const
export const ADMIN_TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export const ADMIN_TASK_STATUSES = ['open', 'in_progress', 'blocked', 'completed', 'cancelled'] as const
export const ADMIN_VERIFICATION_STATUSES = ['under_review', 'approved', 'rejected', 'needs_clarification'] as const
export const ADMIN_VERIFICATION_ENTITY_TYPES = ['property', 'seller', 'owner', 'customer', 'document'] as const
export const ADMIN_USER_ROLES = ['user', 'plot_seller', 'land_owner', 'customer', 'employee', 'admin'] as const
export const ADMIN_EMPLOYEE_ROLES = ['verification_agent', 'field_inspection_agent', 'support_staff'] as const

export type AdminAccountStatus = (typeof ADMIN_ACCOUNT_STATUSES)[number]
export type AdminTaskPriority = (typeof ADMIN_TASK_PRIORITIES)[number]
export type AdminTaskStatus = (typeof ADMIN_TASK_STATUSES)[number]
export type AdminVerificationStatus = (typeof ADMIN_VERIFICATION_STATUSES)[number]
export type AdminVerificationEntityType = (typeof ADMIN_VERIFICATION_ENTITY_TYPES)[number]
export type AdminUserRole = (typeof ADMIN_USER_ROLES)[number]
export type AdminEmployeeRole = (typeof ADMIN_EMPLOYEE_ROLES)[number]
