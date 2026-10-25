import { apiClient, buildAxiosConfig, setAccessToken } from './api/client'
import type { RequestOptions } from './api/types'
import {
  AuthResponseSchema,
  SessionResponseSchema,
  type LoginRequest,
  type RegisterRequest,
  type AuthResponse,
  type SessionResponse,
} from '@/contracts'

export const authService = {
  /**
   * Realiza login do colecionador, armazena o token na memória e retorna dados de autenticação.
   */
  async login(credentials: LoginRequest, options?: RequestOptions): Promise<AuthResponse> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.post('/auth/login', credentials, config)
    const parsed = AuthResponseSchema.parse(response.data)
    setAccessToken(parsed.token)
    return parsed
  },

  /**
   * Cadastra novo usuário, define o token na memória e retorna dados de autenticação.
   */
  async register(data: RegisterRequest, options?: RequestOptions): Promise<AuthResponse> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.post('/auth/register', data, config)
    const parsed = AuthResponseSchema.parse(response.data)
    setAccessToken(parsed.token)
    return parsed
  },

  /**
   * Consulta a sessão ativa atual.
   */
  async getSession(options?: RequestOptions): Promise<SessionResponse> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.get('/auth/session', config)
    return SessionResponseSchema.parse(response.data)
  },

  /**
   * Encerra a sessão atual e remove o token em memória.
   */
  async logout(options?: RequestOptions): Promise<void> {
    const config = buildAxiosConfig(options)
    try {
      await apiClient.post('/auth/logout', {}, config)
    } finally {
      setAccessToken(null)
    }
  },
}
