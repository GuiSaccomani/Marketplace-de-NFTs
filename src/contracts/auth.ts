/**
 * KURIO Contracts: Autenticação, Cadastro e Sessão de Colecionador.
 */
import { z } from 'zod'

export const LoginRequestSchema = z.object({
  email: z.string().email('E-mail inválido').trim().toLowerCase(),
  password: z.string().min(6, 'Senha deve conter pelo menos 6 caracteres'),
})

export type LoginRequest = z.infer<typeof LoginRequestSchema>

export const RegisterRequestSchema = z
  .object({
    name: z.string().min(2, 'Nome deve conter pelo menos 2 caracteres').trim(),
    email: z.string().email('E-mail inválido').trim().toLowerCase(),
    password: z.string().min(6, 'Senha deve conter pelo menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirmação de senha deve conter pelo menos 6 caracteres'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>

export const SessionUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  avatarUrl: z.string().optional(),
  bio: z.string().default(''),
  createdAt: z.string().datetime(),
})

export type SessionUser = z.infer<typeof SessionUserSchema>

export const AuthResponseSchema = z.object({
  token: z.string().min(1),
  user: SessionUserSchema,
  expiresAt: z.string().datetime(),
})

export type AuthResponse = z.infer<typeof AuthResponseSchema>

export const SessionResponseSchema = z.object({
  isAuthenticated: z.boolean(),
  user: SessionUserSchema.nullable(),
})

export type SessionResponse = z.infer<typeof SessionResponseSchema>
