import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50),
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special symbol'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    ethicalAgreementConfirmed: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the Ethical Hacker Code of Conduct & Defensive Use Policy',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passphrases do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required').trim(),
  password: z.string().min(1, 'Password is required'),
});

export const updateRoleSchema = z.object({
  userId: z.string().min(1),
  systemRole: z.enum(['ADMIN', 'ANALYST', 'VIEWER', 'AUDITOR']),
  isActive: z.boolean().optional(),
});

export const adminCreateUserSchema = z.object({
  name: z.string().min(1, 'Name or handle is required').max(60),
  email: z.string().email('Invalid email / login ID format').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  systemRole: z.enum(['ADMIN', 'ANALYST', 'VIEWER', 'AUDITOR']).default('ANALYST'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
