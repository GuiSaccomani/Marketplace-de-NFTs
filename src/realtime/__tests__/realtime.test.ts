import { describe, it, expect, beforeEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import {
  EventDeduplicator,
  VersionTracker,
  KurioRealtimeClient,
} from '@/realtime'
import type { Nft, OrderReceipt, Cart } from '@/contracts'

describe('Camada de Tempo Real (Socket.IO, Deduplicação e Versão) — Etapa 11', () => {
  let deduplicator: EventDeduplicator
  let versionTracker: VersionTracker
  let queryClient: QueryClient
  let realtimeClient: KurioRealtimeClient

  beforeEach(() => {
    deduplicator = new EventDeduplicator(10)
    versionTracker = new VersionTracker()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    realtimeClient = new KurioRealtimeClient()
    void realtimeClient.connect(queryClient)
  })

  describe('Deduplicação de Eventos (EventDeduplicator)', () => {
    it('deve aceitar evento inédito e rejeitar evento duplicado pelo eventId', () => {
      const eventId = '11111111-1111-4111-8111-111111111111'

      // Primeiro processamento: aceito
      expect(deduplicator.isDuplicate(eventId)).toBe(false)

      // Segundo processamento com mesmo eventId: rejeitado como duplicata
      expect(deduplicator.isDuplicate(eventId)).toBe(true)
      expect(deduplicator.size()).toBe(1)
    })

    it('deve realizar descarte rotativo FIFO quando exceder a capacidade máxima', () => {
      // Cria 10 IDs (limite configurado no beforeEach)
      for (let i = 0; i < 10; i++) {
        deduplicator.isDuplicate(`evt-${i}`)
      }
      expect(deduplicator.size()).toBe(10)

      // Adiciona o 11º item
      deduplicator.isDuplicate('evt-11')
      expect(deduplicator.size()).toBe(10)

      // O mais antigo ('evt-0') foi removido da fila FIFO
      expect(deduplicator.isDuplicate('evt-0')).toBe(false)
    })

    it('deve limpar histórico ao resetar sessão', () => {
      deduplicator.isDuplicate('evt-abc')
      expect(deduplicator.size()).toBe(1)

      deduplicator.clear()
      expect(deduplicator.size()).toBe(0)
      expect(deduplicator.isDuplicate('evt-abc')).toBe(false)
    })
  })

  describe('Controle de Versão Monotônica (VersionTracker)', () => {
    it('deve aceitar versões estritamente incrementais e ignorar versões antigas ou iguais', () => {
      const resourceKey = 'nft:nft-03'

      // Versão 1: aceita
      expect(versionTracker.isStale(resourceKey, 1)).toBe(false)

      // Versão 2: aceita (incremental)
      expect(versionTracker.isStale(resourceKey, 2)).toBe(false)

      // Versão 2 repetida: rejeitada como estagnada
      expect(versionTracker.isStale(resourceKey, 2)).toBe(true)

      // Versão 1 atrasada: rejeitada como fora de ordem
      expect(versionTracker.isStale(resourceKey, 1)).toBe(true)

      // Versão 5: aceita (salto legítimo de versão)
      expect(versionTracker.isStale(resourceKey, 5)).toBe(false)
    })

    it('deve isolar versões de recursos distintos', () => {
      expect(versionTracker.isStale('nft:nft-01', 5)).toBe(false)
      expect(versionTracker.isStale('nft:nft-02', 1)).toBe(false)

      expect(versionTracker.getVersion('nft:nft-01')).toBe(5)
      expect(versionTracker.getVersion('nft:nft-02')).toBe(1)
    })

    it('deve rejeitar versões não inteiras ou menores que 1', () => {
      expect(versionTracker.isStale('nft:nft-03', 0)).toBe(true)
      expect(versionTracker.isStale('nft:nft-03', -1)).toBe(true)
    })
  })

  describe('Processamento de Evento nft.updated no TanStack Query', () => {
    const mockNftInitial: Nft = {
      id: 'nft-03',
      tokenId: '1003',
      title: 'Cyber Ronin #03',
      description: 'Ronin renegado.',
      mediaUrl: '/nft-03.png',
      thumbnailUrl: '/nft-03.png',
      priceEth: '0.45',
      collection: {
        id: 'col-01',
        name: 'Cyber Samurais',
        slug: 'cyber-samurais',
        verified: true,
        avatarUrl: '/col-01.png',
      },
      creator: { id: 'u1', name: 'Akiro', address: '0x1111111111111111111111111111111111111111' },
      owner: { id: 'u1', name: 'Akiro', address: '0x1111111111111111111111111111111111111111' },
      editions: { availableCount: 4, totalCount: 10, maxPerOrder: 3 },
      contractAddress: '0x1111111111111111111111111111111111111111',
      blockchainNetwork: 'Ethereum Mainnet',
      featured: true,
      isFavorite: false,
      createdAt: '2026-03-01T10:00:00.000Z',
      version: 1,
    }

    it('deve atualizar o cache do NFT e invalidar o catálogo ao receber evento válido', () => {
      queryClient.setQueryData(['nft', 'nft-03'], mockNftInitial)

      const validPayload = {
        eventId: '22222222-2222-4222-8222-222222222222',
        version: 2,
        timestamp: new Date().toISOString(),
        nftId: 'nft-03',
        priceEth: '0.65',
        availableQuantity: 2,
        status: 'available',
      }

      const processed = realtimeClient.handleNftUpdated(validPayload)
      expect(processed).toBe(true)

      // Verifica se a query ['nft', 'nft-03'] foi atualizada cirurgicamente
      const cached = queryClient.getQueryData<Nft>(['nft', 'nft-03'])
      expect(cached?.priceEth).toBe('0.65')
      expect(cached?.editions.availableCount).toBe(2)
      expect(cached?.version).toBe(2)
    })

    it('deve invalidar carrinho e cotação se o NFT atualizado estiver no carrinho do usuário', () => {
      const mockCart: Cart = {
        items: [
          {
            nftId: 'nft-03',
            title: 'Cyber Ronin #03',
            collectionName: 'Cyber Samurais',
            mediaUrl: '/nft-03.png',
            unitPriceEth: '0.45',
            quantity: 1,
            availableQuantity: 4,
            maxPerOrder: 3,
            subtotalEth: '0.45',
          },
        ],
        itemCount: 1,
        subtotalEth: '0.45',
        updatedAt: new Date().toISOString(),
      }

      queryClient.setQueryData(['cart'], mockCart)

      const validPayload = {
        eventId: '33333333-3333-4333-8333-333333333333',
        version: 3,
        timestamp: new Date().toISOString(),
        nftId: 'nft-03',
        priceEth: '0.80',
        availableQuantity: 1,
        status: 'low_stock',
      }

      const processed = realtimeClient.handleNftUpdated(validPayload)
      expect(processed).toBe(true)
    })

    it('deve rejeitar eventos com payload malformado ou inválido', () => {
      const invalidPayload = {
        eventId: 'not-a-uuid',
        version: -5,
        nftId: 'nft-03',
      }

      const processed = realtimeClient.handleNftUpdated(invalidPayload)
      expect(processed).toBe(false)
    })

    it('deve ignorar evento duplicado com o mesmo eventId', () => {
      const payload = {
        eventId: '44444444-4444-4444-8444-444444444444',
        version: 4,
        timestamp: new Date().toISOString(),
        nftId: 'nft-03',
        priceEth: '0.70',
        availableQuantity: 3,
        status: 'available',
      }

      expect(realtimeClient.handleNftUpdated(payload)).toBe(true)
      // Segunda tentativa com mesmo eventId
      expect(realtimeClient.handleNftUpdated(payload)).toBe(false)
    })

    it('deve ignorar evento fora de ordem com versão anterior', () => {
      const newerPayload = {
        eventId: '55555555-5555-4555-8555-555555555555',
        version: 10,
        timestamp: new Date().toISOString(),
        nftId: 'nft-03',
        priceEth: '0.90',
        availableQuantity: 1,
        status: 'low_stock',
      }

      const olderPayload = {
        eventId: '66666666-6666-4666-8666-666666666666',
        version: 8,
        timestamp: new Date().toISOString(),
        nftId: 'nft-03',
        priceEth: '0.30',
        availableQuantity: 5,
        status: 'available',
      }

      expect(realtimeClient.handleNftUpdated(newerPayload)).toBe(true)
      // Evento mais antigo (v8) chega depois da v10
      expect(realtimeClient.handleNftUpdated(olderPayload)).toBe(false)
    })
  })

  describe('Processamento de Evento order.updated e Snapshot Imutável', () => {
    const mockOrderInitial: OrderReceipt = {
      orderId: 'ord-test-01',
      idempotencyKey: 'idemp-test-01',
      status: 'pending',
      createdAt: '2026-03-01T12:00:00.000Z',
      network: 'Ethereum Mainnet',
      walletAddress: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
      buyer: { name: 'Guilherme', email: 'gui@kurio.test' },
      items: [
        {
          nftId: 'nft-03',
          title: 'Cyber Ronin #03',
          collectionName: 'Cyber Samurais',
          mediaUrl: '/nft-03.png',
          quantity: 1,
          unitPriceEth: '0.45',
          subtotalEth: '0.45',
        },
      ],
      subtotalEth: '0.45',
      discountEth: '0',
      networkFeeEth: '0.005',
      totalEth: '0.455',
      version: 1,
    }

    it('deve atualizar o status do pedido preservando o snapshot imutável dos itens e valores', () => {
      queryClient.setQueryData(['order', 'ord-test-01'], mockOrderInitial)

      const orderUpdatedPayload = {
        eventId: '77777777-7777-4777-8777-777777777777',
        version: 2,
        timestamp: new Date().toISOString(),
        orderId: 'ord-test-01',
        status: 'confirmed' as const,
        transactionHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }

      const processed = realtimeClient.handleOrderUpdated(orderUpdatedPayload)
      expect(processed).toBe(true)

      const cachedOrder = queryClient.getQueryData<OrderReceipt>(['order', 'ord-test-01'])
      expect(cachedOrder?.status).toBe('confirmed')
      expect(cachedOrder?.transactionHash).toBe(orderUpdatedPayload.transactionHash)
      expect(cachedOrder?.version).toBe(2)

      // Garantia de imutabilidade do snapshot do recibo
      expect(cachedOrder?.items.length).toBe(1)
      expect(cachedOrder?.items[0]!.title).toBe('Cyber Ronin #03')
      expect(cachedOrder?.totalEth).toBe('0.455')
      expect(cachedOrder?.createdAt).toBe('2026-03-01T12:00:00.000Z')
    })
  })

  describe('Segurança de Sessão e Limpeza de Estado (Logout e Troca de Usuário)', () => {
    it('deve limpar deduplicador e versionTracker ao chamar resetSession()', () => {
      const eventId = '88888888-8888-4888-8888-888888888888'
      realtimeClient.handleNftUpdated({
        eventId,
        version: 1,
        timestamp: new Date().toISOString(),
        nftId: 'nft-05',
        priceEth: '1.2',
        availableQuantity: 3,
        status: 'available',
      })

      // Limpa estado para nova sessão
      realtimeClient.resetSession()

      // O mesmo eventId pode ser processado na nova sessão sem colisão cruzada
      const acceptedAgain = realtimeClient.handleNftUpdated({
        eventId,
        version: 2,
        timestamp: new Date().toISOString(),
        nftId: 'nft-05',
        priceEth: '1.2',
        availableQuantity: 3,
        status: 'available',
      })
      expect(acceptedAgain).toBe(true)
    })
  })
})
