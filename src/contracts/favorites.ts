/**
 * KURIO Contracts: Favoritos do Colecionador.
 */
import { z } from 'zod'
import { NftSchema } from './nft'

export const FavoriteItemSchema = z.object({
  nftId: z.string().min(1),
  userId: z.string().min(1),
  addedAt: z.string().datetime(),
})

export type FavoriteItem = z.infer<typeof FavoriteItemSchema>

export const ToggleFavoriteRequestSchema = z.object({
  nftId: z.string().min(1),
})

export type ToggleFavoriteRequest = z.infer<typeof ToggleFavoriteRequestSchema>

export const ToggleFavoriteResponseSchema = z.object({
  nftId: z.string().min(1),
  isFavorite: z.boolean(),
  totalFavorites: z.number().int().nonnegative(),
})

export type ToggleFavoriteResponse = z.infer<typeof ToggleFavoriteResponseSchema>

export const FavoritesListResponseSchema = z.object({
  items: z.array(NftSchema),
  total: z.number().int().nonnegative(),
})

export type FavoritesListResponse = z.infer<typeof FavoritesListResponseSchema>
