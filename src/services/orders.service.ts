import { apiClient, buildAxiosConfig } from './api/client'
import type { RequestOptions } from './api/types'
import {
  OrderReceiptSchema,
  type CreateOrderRequest,
  type OrderReceipt,
} from '@/contracts'

export const ordersService = {
  /**
   * Cria um novo pedido de forma estritamente idempotente.
   * Exige a passagem explícita de `idempotencyKey`.
   */
  async createOrder(
    data: CreateOrderRequest,
    idempotencyKey: string,
    options?: RequestOptions,
  ): Promise<OrderReceipt> {
    const config = buildAxiosConfig({
      ...options,
      idempotencyKey,
    })
    const response = await apiClient.post('/orders', data, config)
    return OrderReceiptSchema.parse(response.data)
  },

  /**
   * Consulta os detalhes de um pedido existente pelo ID.
   */
  async getOrderById(orderId: string, options?: RequestOptions): Promise<OrderReceipt> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.get(`/orders/${encodeURIComponent(orderId)}`, config)
    return OrderReceiptSchema.parse(response.data)
  },

  /**
   * Consulta o snapshot imutável do recibo de um pedido.
   */
  async getOrderReceipt(orderId: string, options?: RequestOptions): Promise<OrderReceipt> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.get(
      `/orders/${encodeURIComponent(orderId)}/receipt`,
      config,
    )
    return OrderReceiptSchema.parse(response.data)
  },
}
