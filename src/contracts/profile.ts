/**
 * KURIO Contracts: Perfil do Colecionador e Alteração de Senha.
 */
import { z } from 'zod'

export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(2, 'Nome deve conter pelo menos 2 caracteres').trim(),
  bio: z.string().max(500, 'Bio deve conter no máximo 500 caracteres').optional(),
  avatarUrl: z.string().url('URL de avatar inválida').or(z.string().startsWith('/')).optional(),
})

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>

export const ChangePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(6, 'Nova senha deve conter pelo menos 6 caracteres'),
    confirmNewPassword: z
      .string()
      .min(6, 'Confirmação de nova senha deve conter pelo menos 6 caracteres'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'As novas senhas não coincidem',
    path: ['confirmNewPassword'],
  })

export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>
