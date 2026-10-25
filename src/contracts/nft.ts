/**
 * KURIO Contracts: NFTs, Coleções e Filtros de Catálogo.
 */
import { z } from 'zod'
import { EthAmountSchema, PaginationParamsSchema, createPaginatedResponseSchema } from './common'

export const NftSortOptionSchema = z.enum([
  'recently_listed',
  'price_asc',
  'price_desc',
  'popular',
])

export type NftSortOption = z.infer<typeof NftSortOptionSchema>

export const NftAvailabilityFilterSchema = z.enum(['all', 'available', 'sold_out'])
export type NftAvailabilityFilter = z.infer<typeof NftAvailabilityFilterSchema>

export const NftCollectionSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  verified: z.boolean().default(false),
  avatarUrl: z.string().url().or(z.string().startsWith('/')),
})

export type NftCollectionSummary = z.infer<typeof NftCollectionSummarySchema>

export const NftCreatorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço Ethereum inválido'),
  avatarUrl: z.string().optional(),
})

export type NftCreator = z.infer<typeof NftCreatorSchema>

export const NftEditionsSchema = z.object({
  availableCount: z.number().int().nonnegative(),
  totalCount: z.number().int().positive(),
  maxPerOrder: z.number().int().positive().default(5),
})

export type NftEditions = z.infer<typeof NftEditionsSchema>

export const NftSchema = z.object({
  id: z.string().min(1),
  tokenId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  mediaUrl: z.string().min(1),
  thumbnailUrl: z.string().min(1),
  priceEth: EthAmountSchema,
  collection: NftCollectionSummarySchema,
  creator: NftCreatorSchema,
  owner: NftCreatorSchema,
  editions: NftEditionsSchema,
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço Ethereum inválido'),
  blockchainNetwork: z.string().min(1),
  featured: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  createdAt: z.string().datetime(),
  version: z.number().int().positive().default(1),
})

export type Nft = z.infer<typeof NftSchema>

/**
 * Parâmetros de consulta do catálogo (sincronizados na URL).
 */
export const NftFilterParamsSchema = PaginationParamsSchema.extend({
  search: z.string().optional(),
  collectionId: z.string().optional(),
  minPriceEth: EthAmountSchema.optional(),
  maxPriceEth: EthAmountSchema.optional(),
  network: z.string().optional(),
  availability: NftAvailabilityFilterSchema.default('all'),
  sort: NftSortOptionSchema.default('recently_listed'),
})

export type NftFilterParams = z.infer<typeof NftFilterParamsSchema>

export const PaginatedNftsResponseSchema = createPaginatedResponseSchema(NftSchema)
export type PaginatedNftsResponse = z.infer<typeof PaginatedNftsResponseSchema>

export const CollectionDetailSchema = NftCollectionSummarySchema.extend({
  description: z.string().default(''),
  bannerUrl: z.string().min(1).optional(),
  itemCount: z.number().int().nonnegative(),
  floorPriceEth: EthAmountSchema,
  totalVolumeEth: EthAmountSchema,
  ownerCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
})

export type CollectionDetail = z.infer<typeof CollectionDetailSchema>
