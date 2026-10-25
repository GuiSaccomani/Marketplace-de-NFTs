import { z } from 'zod'
import { apiClient, buildAxiosConfig } from './api/client'
import type { RequestOptions } from './api/types'
import { CollectionDetailSchema, type CollectionDetail } from '@/contracts'

const CollectionsListSchema = z.array(CollectionDetailSchema)

export const collectionsService = {
  /**
   * Lista todas as coleções cadastradas.
   */
  async listCollections(options?: RequestOptions): Promise<CollectionDetail[]> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.get('/collections', config)
    return CollectionsListSchema.parse(response.data)
  },

  /**
   * Obtém detalhes de uma coleção pelo ID ou Slug.
   */
  async getCollectionById(idOrSlug: string, options?: RequestOptions): Promise<CollectionDetail> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.get(`/collections/${encodeURIComponent(idOrSlug)}`, config)
    return CollectionDetailSchema.parse(response.data)
  },
}
