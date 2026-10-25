import { apiClient, buildAxiosConfig } from './api/client'
import type { RequestOptions } from './api/types'
import { CartSchema, type Cart } from '@/contracts'

export const cartService = {
  /**
   * Consulta o estado atual do carrinho.
   */
  async getCart(options?: RequestOptions): Promise<Cart> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.get('/cart', config)
    return CartSchema.parse(response.data)
  },

  /**
   * Adiciona um NFT ao carrinho.
   */
  async addToCart(nftId: string, quantity = 1, options?: RequestOptions): Promise<Cart> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.post('/cart/items', { nftId, quantity }, config)
    return CartSchema.parse(response.data)
  },

  /**
   * Atualiza a quantidade de um NFT no carrinho.
   */
  async updateCartItemQuantity(
    nftId: string,
    quantity: number,
    options?: RequestOptions,
  ): Promise<Cart> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.put(
      `/cart/items/${encodeURIComponent(nftId)}`,
      { quantity },
      config,
    )
    return CartSchema.parse(response.data)
  },

  /**
   * Remove um item do carrinho.
   */
  async removeCartItem(nftId: string, options?: RequestOptions): Promise<Cart> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.delete(`/cart/items/${encodeURIComponent(nftId)}`, config)
    return CartSchema.parse(response.data)
  },
}
