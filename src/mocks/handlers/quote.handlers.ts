/**
 * KURIO Mocks: Handlers REST para Cotação de Checkout com Precisão em ETH.
 */
import { http, HttpResponse } from 'msw'
import {
  QuoteRequestSchema,
  type QuoteResponse,
  type ApiErrorResponse,
  type CartItem,
  type QuoteUnavailableItem,
} from '@/contracts'
import { mockDb } from '../state/db'
import { mockScenarioManager } from '../state/scenarios'
import {
  addEth,
  subEth,
  multiplyEthByQuantity,
  ethToWei,
  weiToEth,
} from '@/domain/money'

export const quoteHandlers = [
  http.post('*/api/quote', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)

    if (scenario === 'transient_error') {
      const error: ApiErrorResponse = {
        code: 'TRANSIENT_ERROR',
        message: 'Falha temporária ao gerar cotação.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 503 })
    }

    if (scenario === 'price_changed') {
      const error: ApiErrorResponse = {
        code: 'PRICE_CHANGED',
        message: 'O preço de um ou mais itens no carrinho foi alterado. Revise sua cotação.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 409 })
    }

    if (scenario === 'out_of_stock') {
      const error: ApiErrorResponse = {
        code: 'OUT_OF_STOCK',
        message: 'Um ou mais itens selecionados estão esgotados.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 409 })
    }

    const body = await request.json().catch(() => null)
    const parseResult = QuoteRequestSchema.safeParse(body)

    if (!parseResult.success) {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos para geração de cotação.',
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const { items: requestedItems, couponCode, network } = parseResult.data

    const items: CartItem[] = []
    const unavailableItems: QuoteUnavailableItem[] = []
    let subtotalEth = '0'

    for (const reqItem of requestedItems) {
      const nft = mockDb.nfts.find((n) => n.id === reqItem.nftId)
      if (!nft) {
        unavailableItems.push({
          nftId: reqItem.nftId,
          title: 'NFT Desconhecido',
          requestedQuantity: reqItem.quantity,
          availableQuantity: 0,
          reason: 'out_of_stock',
        })
        continue
      }

      if (nft.editions.availableCount <= 0) {
        unavailableItems.push({
          nftId: nft.id,
          title: nft.title,
          requestedQuantity: reqItem.quantity,
          availableQuantity: 0,
          reason: 'out_of_stock',
        })
        continue
      }

      if (reqItem.quantity > nft.editions.availableCount) {
        unavailableItems.push({
          nftId: nft.id,
          title: nft.title,
          requestedQuantity: reqItem.quantity,
          availableQuantity: nft.editions.availableCount,
          reason: 'insufficient_quantity',
        })
        continue
      }

      const itemSubtotal = multiplyEthByQuantity(nft.priceEth, reqItem.quantity)
      subtotalEth = addEth(subtotalEth, itemSubtotal)

      items.push({
        nftId: nft.id,
        title: nft.title,
        collectionName: nft.collection.name,
        mediaUrl: nft.mediaUrl,
        unitPriceEth: nft.priceEth,
        quantity: reqItem.quantity,
        availableQuantity: nft.editions.availableCount,
        maxPerOrder: nft.editions.maxPerOrder,
        subtotalEth: itemSubtotal,
      })
    }

    // Cálculo do desconto exato em Wei caso haja cupom válido
    let discountEth = '0'
    let appliedCoupon: QuoteResponse['appliedCoupon']

    if (couponCode) {
      const coupon = mockDb.getCoupon(couponCode)
      const now = new Date()
      if (coupon && coupon.active && now <= new Date(coupon.expiresAt)) {
        const subtotalWei = ethToWei(subtotalEth)
        const discountWei = (subtotalWei * BigInt(coupon.discountPercentage)) / 100n
        discountEth = weiToEth(discountWei)
        appliedCoupon = {
          code: coupon.code,
          discountPercentage: coupon.discountPercentage,
          discountEth,
        }
      }
    }

    // Taxa de rede simulada baseada na rede blockchain selecionada
    const networkLower = network.toLowerCase()
    let networkFeeEth = '0.005' // Ethereum Mainnet padrão
    if (networkLower.includes('sepolia') || networkLower.includes('polygon')) {
      networkFeeEth = '0.001'
    }

    // Total = Subtotal - Desconto + Taxa de Rede
    const afterDiscount = subEth(subtotalEth, discountEth)
    const totalEth = addEth(afterDiscount, networkFeeEth)

    const isAvailable = unavailableItems.length === 0 && items.length > 0

    const response: QuoteResponse = {
      quoteId: `quote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(), // 15 minutos
      items,
      subtotalEth,
      discountEth,
      networkFeeEth,
      totalEth,
      appliedCoupon,
      isAvailable,
      priceChanged: false,
      unavailableItems,
    }

    return HttpResponse.json(response, { status: 200 })
  }),
]
