import { apiClient, buildAxiosConfig } from './api/client'
import type { RequestOptions } from './api/types'
import {
  SessionUserSchema,
  type SessionUser,
  type UpdateProfileRequest,
  type ChangePasswordRequest,
} from '@/contracts'

export const profileService = {
  /**
   * Consulta o perfil do usuário logado.
   */
  async getProfile(options?: RequestOptions): Promise<SessionUser> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.get('/profile', config)
    return SessionUserSchema.parse(response.data)
  },

  /**
   * Atualiza dados cadastrais do perfil (nome, bio, avatar).
   */
  async updateProfile(
    data: UpdateProfileRequest,
    options?: RequestOptions,
  ): Promise<SessionUser> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.put('/profile', data, config)
    return SessionUserSchema.parse(response.data)
  },

  /**
   * Altera a senha do usuário autenticado.
   */
  async changePassword(
    data: ChangePasswordRequest,
    options?: RequestOptions,
  ): Promise<{ ok: boolean; message: string }> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.post('/profile/password', data, config)
    return response.data as { ok: boolean; message: string }
  },
}
