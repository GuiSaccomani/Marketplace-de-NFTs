/**
 * SPIKE & REALTIME (Etapa 03 e Etapa 11) — handlers para MSW + @mswjs/socket.io-binding.
 * Preserva integralmente o Spike e adiciona suporte aos eventos de tempo real nft.updated e order.updated.
 */
import { http, HttpResponse, ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import {
  registerMockSocket,
  unregisterMockSocket,
  broadcastNftUpdated,
  broadcastOrderUpdated,
} from '../realtime/broadcast'
import { mockDb } from '../state/db'
import {
  NftUpdatedEventPayloadSchema,
  OrderUpdatedEventPayloadSchema,
} from '@/contracts'

/** Origem fictícia: garante que nenhum servidor real responda (o teste só passa se o MSW interceptar). */
export const SPIKE_SOCKET_URL = 'wss://realtime.kurio.test'

const spikeSocket = ws.link(/^wss:\/\/realtime\.kurio\.test/)

export const spikeHandlers = [
  // 1. Endpoint do Spike da Etapa 03 (inalterado)
  http.get('*/api/__spike/ping', () => {
    console.info('[MSW-SPIKE] GET /api/__spike/ping interceptado com sucesso!')
    return HttpResponse.json({ ok: true, source: 'msw', at: new Date().toISOString() })
  }),

  // 2. Endpoint auxiliar para simular disparo de evento nft.updated
  http.post('*/api/realtime/simulate/nft-updated', async ({ request }) => {
    const body = await request.json().catch(() => null)
    const parse = NftUpdatedEventPayloadSchema.safeParse(body)
    if (!parse.success) {
      return HttpResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    // Atualiza estado do mockDb para consistência com chamadas REST subsequentes
    const nft = mockDb.nfts.find((n) => n.id === parse.data.nftId)
    if (nft) {
      nft.priceEth = parse.data.priceEth
      nft.editions.availableCount = parse.data.availableQuantity
      nft.version = parse.data.version
    }

    const count = broadcastNftUpdated(parse.data)
    return HttpResponse.json({ ok: true, broadcastedTo: count, event: parse.data })
  }),

  // 3. Endpoint auxiliar para simular disparo de evento order.updated
  http.post('*/api/realtime/simulate/order-updated', async ({ request }) => {
    const body = await request.json().catch(() => null)
    const parse = OrderUpdatedEventPayloadSchema.safeParse(body)
    if (!parse.success) {
      return HttpResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    // Atualiza status do pedido no mockDb se existir
    const orderRecord = mockDb.orders.find((o) => o.order.orderId === parse.data.orderId)
    if (orderRecord) {
      orderRecord.order.status = parse.data.status
      if (parse.data.transactionHash) {
        orderRecord.order.transactionHash = parse.data.transactionHash
      }
      if (parse.data.rejectionReason) {
        orderRecord.order.rejectionReason = parse.data.rejectionReason
      }
      orderRecord.order.version = parse.data.version
    }

    const count = broadcastOrderUpdated(parse.data)
    return HttpResponse.json({ ok: true, broadcastedTo: count, event: parse.data })
  }),

  // 4. Conexão WebSocket interceptada pelo MSW
  spikeSocket.addEventListener('connection', (connection) => {
    console.info('[MSW-REALTIME] conexão WebSocket interceptada!', connection.client.url)
    const io = toSocketIo(connection)

    // Registra conexão para broadcast
    registerMockSocket(io.client)

    // Eventos do Spike (Etapa 03) mantidos 100%
    setTimeout(() => {
      console.info('[MSW-SPIKE] emitindo spike.hello...')
      io.client.emit('spike.hello', { eventId: 'evt-1', version: 1, message: 'olá do MSW' })
    }, 100)

    io.client.on('spike.ping', (_event, payload: unknown) => {
      console.info('[MSW-SPIKE] recebido spike.ping, ecoando spike.pong...', payload)
      io.client.emit('spike.pong', { echo: payload })
    })

    // Escuta de eventos para simulação bidirecional
    io.client.on('simulate.nft.updated', (_event, payload: unknown) => {
      const parse = NftUpdatedEventPayloadSchema.safeParse(payload)
      if (parse.success) {
        broadcastNftUpdated(parse.data)
      }
    })

    io.client.on('simulate.order.updated', (_event, payload: unknown) => {
      const parse = OrderUpdatedEventPayloadSchema.safeParse(payload)
      if (parse.success) {
        broadcastOrderUpdated(parse.data)
      }
    })

    // Ao desconectar
    io.client.on('disconnect', () => {
      unregisterMockSocket(io.client)
    })
  }),
]
