import { z } from 'zod';

// Password validation schema with strong requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password must not exceed 100 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

// Email validation schema
export const emailSchema = z
  .string()
  .email('Please provide a valid email address')
  .max(255, 'Email must not exceed 255 characters')
  .transform((email) => email.toLowerCase().trim());

// Phone number validation schema (flexible for international formats)
export const phoneSchema = z
  .string()
  .regex(
    /^[\+]?[1-9][\d]{0,15}$/,
    'Please provide a valid phone number'
  )
  .optional();

// User role validation
export const userRoleSchema = z.enum([
  'STAFF',
  'RECEPTIONIST', 
  'NURSE',
  'DOCTOR',
  'ORG_ADMIN',
  'SUPER_ADMIN'
]).default('STAFF');

// Login request validation
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Password is required')
    .max(100, 'Password must not exceed 100 characters'),
  remember: z.boolean().optional().default(false),
});

export type LoginRequest = z.infer<typeof loginSchema>;

// Register user request validation
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'First name must only contain letters and spaces'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Last name must only contain letters and spaces'),
  phone: phoneSchema,
  role: userRoleSchema,
  organizationId: z
    .string()
    .cuid('Invalid organization ID format'),
});

export type RegisterRequest = z.infer<typeof registerSchema>;

// Refresh token request validation
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;

// Change password request validation
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z
    .string()
    .min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New password and confirmation do not match',
  path: ['confirmPassword'],
});

export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;

// Password reset request validation
export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

// Password reset confirmation validation
export const resetPasswordConfirmSchema = z.object({
  token: z
    .string()
    .min(1, 'Reset token is required'),
  newPassword: passwordSchema,
  confirmPassword: z
    .string()
    .min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Password and confirmation do not match',
  path: ['confirmPassword'],
});

export type ResetPasswordConfirm = z.infer<typeof resetPasswordConfirmSchema>;

// Update profile validation
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'First name must only contain letters and spaces')
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Last name must only contain letters and spaces')
    .optional(),
  phone: phoneSchema,
  avatar: z
    .string()
    .url('Avatar must be a valid URL')
    .optional(),
}).partial();

export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;

// Verify email request
export const verifyEmailSchema = z.object({
  token: z
    .string()
    .min(1, 'Verification token is required'),
});

export type VerifyEmailRequest = z.infer<typeof verifyEmailSchema>;

// MFA setup request
export const setupMFASchema = z.object({
  password: z
    .string()
    .min(1, 'Current password is required'),
});

export type SetupMFARequest = z.infer<typeof setupMFASchema>;

// MFA verify request
export const verifyMFASchema = z.object({
  token: z
    .string()
    .length(6, 'MFA token must be exactly 6 digits')
    .regex(/^\d{6}$/, 'MFA token must contain only digits'),
});

export type VerifyMFARequest = z.infer<typeof verifyMFASchema>;

// Login with MFA request
export const loginWithMFASchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Password is required'),
  mfaToken: z
    .string()
    .length(6, 'MFA token must be exactly 6 digits')
    .regex(/^\d{6}$/, 'MFA token must contain only digits'),
  remember: z.boolean().optional().default(false),
});

export type LoginWithMFARequest = z.infer<typeof loginWithMFASchema>;

/**
 * Validation middleware factory
 * Creates Express middleware for validating request bodies against Zod schemas
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const validatedData = schema.parse(req.body);
      req.validatedBody = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Request data is invalid',
          details: formattedErrors,
          code: 'VALIDATION_ERROR'
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Request body validation failed',
        code: 'REQUEST_INVALID'
      });
    }
  };
};

// Export commonly used validation middleware
export const validateLogin = validateRequest(loginSchema);
export const validateRegister = validateRequest(registerSchema);
export const validateRefreshToken = validateRequest(refreshTokenSchema);
export const validateChangePassword = validateRequest(changePasswordSchema);
export const validateResetPasswordRequest = validateRequest(resetPasswordRequestSchema);
export const validateResetPasswordConfirm = validateRequest(resetPasswordConfirmSchema);
export const validateUpdateProfile = validateRequest(updateProfileSchema);
export const validateVerifyEmail = validateRequest(verifyEmailSchema);
export const validateSetupMFA = validateRequest(setupMFASchema);
export const validateVerifyMFA = validateRequest(verifyMFASchema);
export const validateLoginWithMFA = validateRequest(loginWithMFASchema);
