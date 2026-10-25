/**
 * KURIO Mocks: Handlers REST para Favoritos do Colecionador.
 */
import { http, HttpResponse } from 'msw'
import {
  ToggleFavoriteRequestSchema,
  type FavoritesListResponse,
  type ToggleFavoriteResponse,
  type ApiErrorResponse,
} from '@/contracts'
import { mockDb, resolveAuthenticatedUser } from '../state/db'
import { mockScenarioManager } from '../state/scenarios'

export const favoritesHandlers = [
  // Listar favoritos do usuário autenticado
  http.get('*/api/favorites', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)
    const user = resolveAuthenticatedUser(request)

    if (scenario === 'unauthorized' || !user) {
      const error: ApiErrorResponse = {
        code: 'UNAUTHORIZED',
        message: 'Faça login para acessar seus favoritos.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 401 })
    }

    const userFavoriteIds = mockDb.favorites[user.id] ?? []
    const favoriteNfts = mockDb.nfts
      .filter((n) => userFavoriteIds.includes(n.id))
      .map((n) => ({ ...n, isFavorite: true }))

    const response: FavoritesListResponse = {
      items: favoriteNfts,
      total: favoriteNfts.length,
    }

    return HttpResponse.json(response, { status: 200 })
  }),

  // Alternar favorito (toggle)
  http.post('*/api/favorites/toggle', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)
    const user = resolveAuthenticatedUser(request)

    if (scenario === 'unauthorized' || !user) {
      const error: ApiErrorResponse = {
        code: 'UNAUTHORIZED',
        message: 'Faça login para favoritar itens.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parseResult = ToggleFavoriteRequestSchema.safeParse(body)

    if (!parseResult.success) {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos para alternar favorito.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const { nftId } = parseResult.data
    const nft = mockDb.nfts.find((n) => n.id === nftId)

    if (!nft) {
      const error: ApiErrorResponse = {
        code: 'NOT_FOUND',
        message: 'NFT não encontrado.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 404 })
    }

    const userId = user.id
    const userFavorites = mockDb.favorites[userId] ?? []
    const index = userFavorites.indexOf(nftId)
    let isFavorite = false

    if (index >= 0) {
      userFavorites.splice(index, 1)
      isFavorite = false
    } else {
      userFavorites.push(nftId)
      isFavorite = true
    }

    mockDb.favorites[userId] = userFavorites

    const response: ToggleFavoriteResponse = {
      nftId,
      isFavorite,
      totalFavorites: userFavorites.length,
    }

    return HttpResponse.json(response, { status: 200 })
  }),
]
