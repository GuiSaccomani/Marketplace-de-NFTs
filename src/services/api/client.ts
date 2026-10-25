import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ApiClientError, type RequestOptions } from './types'
import { ApiErrorResponseSchema, type ApiErrorResponse } from '@/contracts'

let inMemoryAccessToken: string | null = null
let onUnauthorizedHandler: (() => void) | null = null

/**
 * Define ou limpa o token de acesso mantido estritamente em memória.
 * Atende à exigência de não expor credenciais em localStorage sem necessidade.
 */
export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token
}

/**
 * Recupera o token de acesso atual em memória.
 */
export function getAccessToken(): string | null {
  return inMemoryAccessToken
}

/**
 * Registra callback para tratamento de 401 sem provocar loops.
 */
export function setOnUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorizedHandler = handler
}

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return '/api'
  }
  return 'http://localhost/api'
}

/**
 * Criação da instância centralizada do Axios para o KURIO Marketplace.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Interceptor de Requisição: Injeção de autenticação e cabeçalhos de contexto
apiClient.interceptors.request.use((config) => {
  if (inMemoryAccessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`
  }
  return config
})

// Interceptor de Resposta: Normalização estrita de erros e tratamento de sessão
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    // 1. Cancelamento intencional via AbortSignal / AbortController
    if (axios.isCancel(error)) {
      return Promise.reject(
        new ApiClientError({
          message: 'Requisição cancelada pelo cliente.',
          code: 'REQUEST_CANCELLED',
          isCancelled: true,
        }),
      )
    }

    if (axios.isAxiosError(error)) {
      // 2. Timeout da requisição
      if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
        return Promise.reject(
          new ApiClientError({
            message: 'Tempo limite da requisição esgotado. Verifique sua conexão.',
            code: 'REQUEST_TIMEOUT',
            isTimeout: true,
          }),
        )
      }

      // 3. Falha de rede / sem resposta do servidor
      if (!error.response) {
        return Promise.reject(
          new ApiClientError({
            message: 'Erro de conexão de rede. Verifique seu acesso à internet.',
            code: 'NETWORK_ERROR',
            isNetworkError: true,
          }),
        )
      }

      const status = error.response.status
      const responseData = error.response.data as unknown
      const url = error.config?.url ?? ''

      // Tentativa de validar corpo do erro contra o schema padronizado de erro
      const parseResult = ApiErrorResponseSchema.safeParse(responseData)
      const rawError: ApiErrorResponse | null = parseResult.success ? parseResult.data : null

      const errorCode = rawError?.code || `HTTP_${status}`
      const errorMessage =
        rawError?.message ||
        (typeof responseData === 'object' && responseData && 'message' in responseData
          ? String((responseData as { message: unknown }).message)
          : error.message || 'Ocorreu um erro no servidor.')

      // 4. Tratamento de 401 sem loops de requisição:
      // Ignora chamadas para /auth/session para evitar loop quando a sessão já não existe
      if (status === 401 && !url.includes('/auth/session')) {
        if (onUnauthorizedHandler) {
          onUnauthorizedHandler()
        }
      }

      return Promise.reject(
        new ApiClientError({
          message: errorMessage,
          code: errorCode,
          status,
          details: rawError?.errors || rawError?.details,
          rawError,
        }),
      )
    }

    // 5. Erro inesperado não-Axios
    return Promise.reject(
      new ApiClientError({
        message: error instanceof Error ? error.message : 'Erro inesperado.',
        code: 'UNKNOWN_ERROR',
      }),
    )
  },
)

/**
 * Função utilitária para transformar RequestOptions em configuração Axios.
 */
export function buildAxiosConfig(options?: RequestOptions): AxiosRequestConfig {
  if (!options) return {}

  const config: AxiosRequestConfig = {
    signal: options.signal,
    headers: { ...options.headers },
  }

  if (options.mockScenario) {
    config.headers = {
      ...config.headers,
      'x-mock-scenario': options.mockScenario,
    }
  }

  if (options.idempotencyKey) {
    config.headers = {
      ...config.headers,
      'idempotency-key': options.idempotencyKey,
    }
  }

  return config
}
