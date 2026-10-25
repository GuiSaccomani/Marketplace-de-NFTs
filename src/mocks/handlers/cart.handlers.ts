/**
 * KURIO Mocks: Handlers REST para Carrinho de NFTs.
 */
import { http, HttpResponse } from 'msw'
import {
  AddToCartRequestSchema,
  UpdateCartItemQuantityRequestSchema,
  type Cart,
  type ApiErrorResponse,
} from '@/contracts'
import { mockDb } from '../state/db'
import { mockScenarioManager } from '../state/scenarios'

function getSessionId(request: Request): string {
  return request.headers.get('x-session-id') || mockDb.currentSessionUserId || 'guest-session'
}

export const cartHandlers = [
  // Consulta do carrinho
  http.get('*/api/cart', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)
    if (scenario === 'transient_error') {
      const error: ApiErrorResponse = {
        code: 'TRANSIENT_ERROR',
        message: 'Falha temporária ao carregar o carrinho.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 503 })
    }

    const sessionId = getSessionId(request)
    const { items, subtotalEth } = mockDb.getCart(sessionId)

    const cart: Cart = {
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalEth,
      updatedAt: new Date().toISOString(),
    }

    return HttpResponse.json(cart, { status: 200 })
  }),

  // Adicionar item ao carrinho
  http.post('*/api/cart/items', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)
    if (scenario === 'out_of_stock') {
      const error: ApiErrorResponse = {
        code: 'OUT_OF_STOCK',
        message: 'Esta edição do NFT esgotou enquanto você navegava.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 409 })
    }

    const body = await request.json().catch(() => null)
    const parseResult = AddToCartRequestSchema.safeParse(body)

    if (!parseResult.success) {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos ao adicionar ao carrinho.',
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const { nftId, quantity } = parseResult.data
    const nft = mockDb.nfts.find((n) => n.id === nftId)

    if (!nft) {
      const error: ApiErrorResponse = {
        code: 'NOT_FOUND',
        message: 'NFT não encontrado.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 404 })
    }

    if (nft.editions.availableCount <= 0) {
      const error: ApiErrorResponse = {
        code: 'OUT_OF_STOCK',
        message: 'Edição esgotada.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 409 })
    }

    const sessionId = getSessionId(request)
    const currentItem = (mockDb.carts[sessionId] ?? []).find((i) => i.nftId === nftId)
    const currentQty = currentItem?.quantity ?? 0
    const newQty = currentQty + quantity

    if (newQty > nft.editions.availableCount) {
      const error: ApiErrorResponse = {
        code: 'OUT_OF_STOCK',
        message: `Quantidade solicitada (${newQty}) excede a disponibilidade em estoque (${nft.editions.availableCount}).`,
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 409 })
    }

    if (newQty > nft.editions.maxPerOrder) {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: `Limite máximo de ${nft.editions.maxPerOrder} unidades por pedido excedido.`,
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    mockDb.setCartItem(sessionId, nftId, newQty)
    const { items, subtotalEth } = mockDb.getCart(sessionId)

    const cart: Cart = {
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalEth,
      updatedAt: new Date().toISOString(),
    }

    return HttpResponse.json(cart, { status: 200 })
  }),

  // Atualizar quantidade de um item
  http.put('*/api/cart/items/:nftId', async ({ params, request }) => {
    const { nftId } = params
    const body = await request.json().catch(() => null)
    const parseResult = UpdateCartItemQuantityRequestSchema.safeParse(body)

    if (!parseResult.success) {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Quantidade inválida.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const { quantity } = parseResult.data
    const nft = mockDb.nfts.find((n) => n.id === nftId)

    if (!nft) {
      const error: ApiErrorResponse = {
        code: 'NOT_FOUND',
        message: 'NFT não encontrado.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 404 })
    }

    if (quantity > nft.editions.availableCount) {
      const error: ApiErrorResponse = {
        code: 'OUT_OF_STOCK',
        message: `Estoque insuficiente. Apenas ${nft.editions.availableCount} unidades disponíveis.`,
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 409 })
    }

    const sessionId = getSessionId(request)
    mockDb.setCartItem(sessionId, String(nftId), quantity)
    const { items, subtotalEth } = mockDb.getCart(sessionId)

    const cart: Cart = {
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalEth,
      updatedAt: new Date().toISOString(),
    }

    return HttpResponse.json(cart, { status: 200 })
  }),

  // Remover item do carrinho
  http.delete('*/api/cart/items/:nftId', async ({ params, request }) => {
    const { nftId } = params
    const sessionId = getSessionId(request)
    mockDb.removeCartItem(sessionId, String(nftId))
    const { items, subtotalEth } = mockDb.getCart(sessionId)

    const cart: Cart = {
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalEth,
      updatedAt: new Date().toISOString(),
    }

    return HttpResponse.json(cart, { status: 200 })
  }),
]
