import { apiClient, buildAxiosConfig } from './api/client'
import type { RequestOptions } from './api/types'
import { QuoteResponseSchema, type QuoteRequest, type QuoteResponse } from '@/contracts'

export const quoteService = {
  /**
   * Gera cotação para os itens especificados com cálculo exato de descontos e taxas de rede.
   */
  async getQuote(data: QuoteRequest, options?: RequestOptions): Promise<QuoteResponse> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.post('/quote', data, config)
    return QuoteResponseSchema.parse(response.data)
  },
}
