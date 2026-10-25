import { apiClient, buildAxiosConfig } from './api/client'
import type { RequestOptions } from './api/types'
import {
  PaginatedNftsResponseSchema,
  NftSchema,
  type Nft,
  type PaginatedNftsResponse,
  type NftFilterParams,
} from '@/contracts'

export const nftsService = {
  /**
   * Lista NFTs com filtros de busca, paginação e ordenação.
   */
  async listNfts(
    params?: Partial<NftFilterParams>,
    options?: RequestOptions,
  ): Promise<PaginatedNftsResponse> {
    const config = buildAxiosConfig(options)
    config.params = params

    const response = await apiClient.get('/nfts', config)
    return PaginatedNftsResponseSchema.parse(response.data)
  },

  /**
   * Obtém detalhes completos de um NFT por ID.
   */
  async getNftById(id: string, options?: RequestOptions): Promise<Nft> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.get(`/nfts/${encodeURIComponent(id)}`, config)
    return NftSchema.parse(response.data)
  },
}
