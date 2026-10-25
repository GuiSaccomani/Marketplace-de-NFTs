/**
 * KURIO Mocks: Handlers REST para Criação Idempotente e Consulta de Pedidos.
 *
 * Em conformidade com CHALLENGE.md (Seção 5):
 * "As mutations de pedido devem aceitar uma chave de idempotência. Na simulação, a mesma tentativa
 * deve recuperar o mesmo pedido; reutilizar a chave com conteúdo diferente deve gerar conflito."
 */
import { http, HttpResponse } from 'msw'
import {
  CreateOrderRequestSchema,
  type OrderReceipt,
  type ApiErrorResponse,
  type OrderItemSnapshot,
} from '@/contracts'
import { mockDb, type MockOrderRecord } from '../state/db'
import { mockScenarioManager } from '../state/scenarios'
import { addEth, subEth } from '@/domain/money'

export const ordersHandlers = [
  // Criação idempotente de pedido
  http.post('*/api/orders', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)

    if (scenario === 'transient_error') {
      const error: ApiErrorResponse = {
        code: 'TRANSIENT_ERROR',
        message: 'Timeout temporário de rede ao processar transação.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 503 })
    }

    const idempotencyKey =
      request.headers.get('idempotency-key') ||
      request.headers.get('Idempotency-Key') ||
      request.headers.get('IDEMPOTENCY-KEY')

    if (!idempotencyKey) {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Cabeçalho Idempotency-Key é obrigatório para criação de pedidos.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const rawBody = await request.text()
    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(rawBody)
    } catch {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Corpo da requisição inválido (JSON malformado).',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const parseResult = CreateOrderRequestSchema.safeParse(parsedJson)
    if (!parseResult.success) {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Dados do pedido inválidos.',
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const requestHash = JSON.stringify(parseResult.data)

    // 1. Verificação de Idempotência
    const existingOrderRecord = mockDb.orders.find((o) => o.idempotencyKey === idempotencyKey)

    if (existingOrderRecord) {
      if (existingOrderRecord.requestHash === requestHash) {
        // Mesma chave com mesmo conteúdo: recupera o pedido existente de forma segura
        return HttpResponse.json(existingOrderRecord.order, { status: 200 })
      }
      // Mesma chave com conteúdo diferente: conflito de idempotência
      const error: ApiErrorResponse = {
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'A chave de idempotência já foi utilizada com parâmetros diferentes.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 409 })
    }

    const { walletAddress, network, buyer, expectedTotalEth } = parseResult.data

    // Processamento do pedido a partir dos itens do carrinho do usuário atual
    const sessionId = mockDb.currentSessionUserId || 'guest-session'
    const { items: cartItems, subtotalEth } = mockDb.getCart(sessionId)

    if (cartItems.length === 0) {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'O carrinho está vazio.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const orderItems: OrderItemSnapshot[] = cartItems.map((item) => ({
      nftId: item.nftId,
      title: item.title,
      collectionName: item.collectionName,
      mediaUrl: item.mediaUrl,
      quantity: item.quantity,
      unitPriceEth: item.unitPriceEth,
      subtotalEth: item.subtotalEth,
    }))

    // Cenário de recusa de pagamento
    if (scenario === 'payment_rejected') {
      const rejectedOrder: OrderReceipt = {
        orderId: `ord-${Date.now()}`,
        idempotencyKey,
        status: 'rejected',
        createdAt: new Date().toISOString(),
        rejectionReason: 'Saldo insuficiente ou transação rejeitada na carteira simulada.',
        network,
        walletAddress,
        buyer,
        items: orderItems,
        subtotalEth,
        discountEth: '0',
        networkFeeEth: '0',
        totalEth: expectedTotalEth,
        version: 1,
      }

      mockDb.orders.push({
        idempotencyKey,
        requestHash,
        order: rejectedOrder,
      })

      return HttpResponse.json(rejectedOrder, { status: 200 })
    }

    // Abater estoque apenas quando a compra for confirmada
    for (const item of cartItems) {
      const nft = mockDb.nfts.find((n) => n.id === item.nftId)
      if (nft) {
        nft.editions.availableCount = Math.max(0, nft.editions.availableCount - item.quantity)
      }
    }

    // Taxa de rede simulada
    const networkLower = network.toLowerCase()
    const networkFeeEth =
      networkLower.includes('sepolia') || networkLower.includes('polygon') ? '0.001' : '0.005'

    let totalEth = addEth(subtotalEth, networkFeeEth)
    let discountEth = '0'

    // Se a cotação calculada pelo cliente incluir desconto de cupom
    if (expectedTotalEth && expectedTotalEth !== totalEth) {
      try {
        const fullPrice = addEth(subtotalEth, networkFeeEth)
        discountEth = subEth(fullPrice, expectedTotalEth)
        totalEth = expectedTotalEth
      } catch {
        // Fallback caso não seja subtração válida
      }
    }

    // Criação do snapshot imutável do pedido confirmado
    const newOrder: OrderReceipt = {
      orderId: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      idempotencyKey,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
      transactionHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      network,
      walletAddress,
      buyer,
      items: orderItems,
      subtotalEth,
      discountEth,
      networkFeeEth,
      totalEth,
      version: 1,
    }

    const orderRecord: MockOrderRecord = {
      idempotencyKey,
      requestHash,
      order: newOrder,
    }

    mockDb.orders.push(orderRecord)
    mockDb.savePersistentData()

    // Limpar itens comprados do carrinho
    mockDb.clearCart(sessionId)

    return HttpResponse.json(newOrder, { status: 201 })
  }),

  // Consulta de pedido por ID
  http.get('*/api/orders/:id', async ({ params, request }) => {
    mockDb.loadPersistentData()
    const scenario = mockScenarioManager.getScenario(request)
    if (scenario === 'transient_error') {
      const error: ApiErrorResponse = {
        code: 'TRANSIENT_ERROR',
        message: 'Falha temporária ao consultar estado do pedido.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 503 })
    }

    const { id } = params
    const record = mockDb.orders.find((o) => o.order.orderId === id)

    if (!record) {
      const error: ApiErrorResponse = {
        code: 'NOT_FOUND',
        message: `Pedido "${id}" não foi encontrado.`,
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 404 })
    }

    return HttpResponse.json(record.order, { status: 200 })
  }),

  // Consulta do recibo imutável por ID
  http.get('*/api/orders/:id/receipt', async ({ params }) => {
    mockDb.loadPersistentData()
    const { id } = params
    const record = mockDb.orders.find((o) => o.order.orderId === id)

    if (!record) {
      const error: ApiErrorResponse = {
        code: 'NOT_FOUND',
        message: `Recibo para o pedido "${id}" não foi encontrado.`,
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 404 })
    }

    return HttpResponse.json(record.order, { status: 200 })
  }),
]
