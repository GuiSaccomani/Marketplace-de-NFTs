import type { AxiosRequestConfig } from 'axios'
import type { ApiErrorResponse } from '@/contracts'

/**
 * Opções comuns para requisições na camada de API.
 */
export interface RequestOptions extends Pick<AxiosRequestConfig, 'signal' | 'headers'> {
  /**
   * Header opcional para ativar cenários determinísticos de mock (ex: 'empty_nfts', 'transient_error', 'out_of_stock').
   */
  mockScenario?: string
  /**
   * Chave de idempotência para criação segura de pedidos.
   */
  idempotencyKey?: string
}

/**
 * Erro padronizado retornado pela camada de serviços.
 */
export class ApiClientError extends Error {
  public readonly status?: number
  public readonly code: string
  public readonly details?: unknown
  public readonly isNetworkError: boolean
  public readonly isTimeout: boolean
  public readonly isCancelled: boolean
  public readonly rawError: ApiErrorResponse | null

  constructor(params: {
    message: string
    code: string
    status?: number
    details?: unknown
    isNetworkError?: boolean
    isTimeout?: boolean
    isCancelled?: boolean
    rawError?: ApiErrorResponse | null
  }) {
    super(params.message)
    this.name = 'ApiClientError'
    this.status = params.status
    this.code = params.code
    this.details = params.details
    this.isNetworkError = params.isNetworkError ?? false
    this.isTimeout = params.isTimeout ?? false
    this.isCancelled = params.isCancelled ?? false
    this.rawError = params.rawError ?? null

    Object.setPrototypeOf(this, ApiClientError.prototype)
  }
}
