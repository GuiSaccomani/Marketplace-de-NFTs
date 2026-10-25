/**
 * KURIO Mocks: Handlers REST para NFTs e Coleções.
 */
import { http, HttpResponse } from 'msw'
import {
  NftFilterParamsSchema,
  type PaginatedNftsResponse,
  type ApiErrorResponse,
  type CollectionDetail,
  type Nft,
} from '@/contracts'
import { mockDb } from '../state/db'
import { mockScenarioManager } from '../state/scenarios'
import { compareEth } from '@/domain/money'

export const nftsHandlers = [
  // Listagem de NFTs com filtros, ordenação e paginação
  http.get('*/api/nfts', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)

    if (scenario === 'transient_error') {
      const error: ApiErrorResponse = {
        code: 'TRANSIENT_ERROR',
        message: 'Erro temporário ao carregar o catálogo de NFTs.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 503 })
    }

    if (scenario === 'empty_nfts') {
      const emptyResponse: PaginatedNftsResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 12,
        totalPages: 0,
        hasMore: false,
      }
      return HttpResponse.json(emptyResponse, { status: 200 })
    }

    const url = new URL(request.url)
    const rawParams = {
      search: url.searchParams.get('search') ?? undefined,
      collectionId: url.searchParams.get('collectionId') ?? undefined,
      minPriceEth: url.searchParams.get('minPriceEth') ?? undefined,
      maxPriceEth: url.searchParams.get('maxPriceEth') ?? undefined,
      network: url.searchParams.get('network') ?? undefined,
      availability: url.searchParams.get('availability') ?? undefined,
      sort: url.searchParams.get('sort') ?? undefined,
      page: url.searchParams.get('page') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    }

    const parseResult = NftFilterParamsSchema.safeParse(rawParams)
    const filters = parseResult.success ? parseResult.data : NftFilterParamsSchema.parse({})

    let filtered = [...mockDb.nfts]

    // 1. Busca textual (título ou coleção)
    if (filters.search) {
      const query = filters.search.toLowerCase()
      filtered = filtered.filter(
        (nft) =>
          nft.title.toLowerCase().includes(query) ||
          nft.collection.name.toLowerCase().includes(query),
      )
    }

    // 2. Filtro por coleção
    if (filters.collectionId) {
      filtered = filtered.filter((nft) => nft.collection.id === filters.collectionId)
    }

    // 3. Filtro por rede blockchain
    if (filters.network) {
      filtered = filtered.filter(
        (nft) => nft.blockchainNetwork.toLowerCase() === filters.network?.toLowerCase(),
      )
    }

    // 4. Filtro por disponibilidade
    if (filters.availability === 'available') {
      filtered = filtered.filter((nft) => nft.editions.availableCount > 0)
    } else if (filters.availability === 'sold_out') {
      filtered = filtered.filter((nft) => nft.editions.availableCount === 0)
    }

    // 5. Filtro por faixa de preço em ETH (usando comparação exata compareEth)
    if (filters.minPriceEth) {
      const min = filters.minPriceEth
      filtered = filtered.filter((nft) => compareEth(nft.priceEth, min) >= 0)
    }
    if (filters.maxPriceEth) {
      const max = filters.maxPriceEth
      filtered = filtered.filter((nft) => compareEth(nft.priceEth, max) <= 0)
    }

    // 6. Ordenação exata
    filtered.sort((a, b) => {
      if (filters.sort === 'price_asc') {
        return compareEth(a.priceEth, b.priceEth)
      }
      if (filters.sort === 'price_desc') {
        return compareEth(b.priceEth, a.priceEth)
      }
      if (filters.sort === 'popular') {
        // Mais edições vendidas primeiro
        const soldA = a.editions.totalCount - a.editions.availableCount
        const soldB = b.editions.totalCount - b.editions.availableCount
        return soldB - soldA
      }
      // recently_listed padrão
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    // 7. Paginação
    const total = filtered.length
    const totalPages = Math.ceil(total / filters.limit)
    const startIndex = (filters.page - 1) * filters.limit
    const paginatedItems = filtered.slice(startIndex, startIndex + filters.limit)
    const hasMore = filters.page < totalPages

    const response: PaginatedNftsResponse = {
      items: paginatedItems,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages,
      hasMore,
    }

    return HttpResponse.json(response, { status: 200 })
  }),

  // Detalhe de NFT por ID
  http.get('*/api/nfts/:id', async ({ params, request }) => {
    const scenario = mockScenarioManager.getScenario(request)
    if (scenario === 'transient_error') {
      const error: ApiErrorResponse = {
        code: 'TRANSIENT_ERROR',
        message: 'Falha temporária ao carregar detalhes do NFT.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 503 })
    }

    const { id } = params
    const nft = mockDb.nfts.find((n) => n.id === id)

    if (!nft) {
      const error: ApiErrorResponse = {
        code: 'NOT_FOUND',
        message: `NFT com identificador "${id}" não foi encontrado.`,
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 404 })
    }

    return HttpResponse.json(nft as Nft, { status: 200 })
  }),
]

export const collectionsHandlers = [
  // Listagem de Coleções
  http.get('*/api/collections', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)
    if (scenario === 'transient_error') {
      const error: ApiErrorResponse = {
        code: 'TRANSIENT_ERROR',
        message: 'Falha temporária ao carregar coleções.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 503 })
    }

    return HttpResponse.json(mockDb.collections, { status: 200 })
  }),

  // Detalhe de Coleção por ID ou Slug
  http.get('*/api/collections/:id', async ({ params, request }) => {
    const scenario = mockScenarioManager.getScenario(request)
    if (scenario === 'transient_error') {
      const error: ApiErrorResponse = {
        code: 'TRANSIENT_ERROR',
        message: 'Falha temporária ao carregar coleção.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 503 })
    }

    const { id } = params
    const collection = mockDb.collections.find((c) => c.id === id || c.slug === id)

    if (!collection) {
      const error: ApiErrorResponse = {
        code: 'NOT_FOUND',
        message: `Coleção "${id}" não encontrada.`,
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 404 })
    }

    return HttpResponse.json(collection as CollectionDetail, { status: 200 })
  }),
]
