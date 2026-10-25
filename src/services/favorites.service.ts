import { apiClient, buildAxiosConfig } from './api/client'
import type { RequestOptions } from './api/types'
import {
  FavoritesListResponseSchema,
  ToggleFavoriteResponseSchema,
  type FavoritesListResponse,
  type ToggleFavoriteResponse,
} from '@/contracts'

export const favoritesService = {
  /**
   * Lista os NFTs favoritados pelo usuário autenticado.
   */
  async listFavorites(options?: RequestOptions): Promise<FavoritesListResponse> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.get('/favorites', config)
    return FavoritesListResponseSchema.parse(response.data)
  },

  /**
   * Alterna estado de favorito de um NFT.
   */
  async toggleFavorite(nftId: string, options?: RequestOptions): Promise<ToggleFavoriteResponse> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.post('/favorites/toggle', { nftId }, config)
    return ToggleFavoriteResponseSchema.parse(response.data)
  },
}
