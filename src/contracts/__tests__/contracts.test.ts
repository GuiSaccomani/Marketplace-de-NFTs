import { describe, it, expect } from 'vitest'
import {
  EthAmountSchema,
  NftSchema,
  NftFilterParamsSchema,
  CartItemSchema,
  QuoteResponseSchema,
  CreateOrderRequestSchema,
  OrderReceiptSchema,
  RegisterRequestSchema,
  ChangePasswordRequestSchema,
  NftUpdatedEventPayloadSchema,
  OrderUpdatedEventPayloadSchema,
  ApiErrorResponseSchema,
} from '../index'

describe('Contracts: Schemas Zod & DTOs', () => {
  describe('EthAmountSchema', () => {
    it('deve aceitar strings decimais válidas em ETH', () => {
      expect(EthAmountSchema.safeParse('0.5').success).toBe(true)
      expect(EthAmountSchema.safeParse('0').success).toBe(true)
      expect(EthAmountSchema.safeParse('100.123456789012345678').success).toBe(true)
    })

    it('deve rejeitar tipo number e strings malformadas', () => {
      // Regra fundamental: valores em ETH nunca devem ser number
      expect(EthAmountSchema.safeParse(0.5).success).toBe(false)
      expect(EthAmountSchema.safeParse('-1').success).toBe(false)
      expect(EthAmountSchema.safeParse('1.1234567890123456789').success).toBe(false) // 19 casas
      expect(EthAmountSchema.safeParse('abc').success).toBe(false)
    })
  })

  describe('NftSchema & Filtros', () => {
    it('deve validar um NFT válido', () => {
      const validNft = {
        id: 'nft-1',
        tokenId: '101',
        title: 'Cyber Samurai #01',
        description: 'Primeira edição lendária.',
        mediaUrl: '/assets/nfts/nft-01.png',
        thumbnailUrl: '/assets/nfts/nft-01.png',
        priceEth: '0.45',
        collection: {
          id: 'col-1',
          name: 'Cyber Samurais',
          slug: 'cyber-samurais',
          verified: true,
          avatarUrl: '/assets/collections/col-01.png',
        },
        creator: {
          id: 'user-1',
          name: 'Akiro Sato',
          address: '0x1234567890123456789012345678901234567890',
        },
        owner: {
          id: 'user-1',
          name: 'Akiro Sato',
          address: '0x1234567890123456789012345678901234567890',
        },
        editions: {
          availableCount: 3,
          totalCount: 10,
          maxPerOrder: 3,
        },
        contractAddress: '0x0000000000000000000000000000000000000001',
        blockchainNetwork: 'Ethereum Mainnet',
        featured: true,
        isFavorite: false,
        createdAt: '2026-10-24T12:00:00.000Z',
        version: 1,
      }

      const result = NftSchema.safeParse(validNft)
      expect(result.success).toBe(true)
    })

    it('deve aplicar defaults nos filtros de catálogo', () => {
      const parsed = NftFilterParamsSchema.parse({})
      expect(parsed.page).toBe(1)
      expect(parsed.limit).toBe(12)
      expect(parsed.availability).toBe('all')
      expect(parsed.sort).toBe('recently_listed')
    })
  })

  describe('Cart & Quote', () => {
    it('deve validar item de carrinho com quantidade inteira e preços em string ETH', () => {
      const item = {
        nftId: 'nft-1',
        title: 'Cyber Samurai #01',
        collectionName: 'Cyber Samurais',
        mediaUrl: '/assets/nfts/nft-01.png',
        unitPriceEth: '0.45',
        quantity: 2,
        availableQuantity: 5,
        maxPerOrder: 5,
        subtotalEth: '0.9',
      }
      expect(CartItemSchema.safeParse(item).success).toBe(true)
    })

    it('deve rejeitar item de carrinho com quantidade fracionária', () => {
      const item = {
        nftId: 'nft-1',
        title: 'Cyber Samurai #01',
        collectionName: 'Cyber Samurais',
        mediaUrl: '/assets/nfts/nft-01.png',
        unitPriceEth: '0.45',
        quantity: 2.5, // inválido
        availableQuantity: 5,
        maxPerOrder: 5,
        subtotalEth: '0.9',
      }
      expect(CartItemSchema.safeParse(item).success).toBe(false)
    })

    it('deve validar resposta de cotação com cupom e taxas', () => {
      const quote = {
        quoteId: 'quote-100',
        expiresAt: '2026-10-24T12:30:00.000Z',
        items: [
          {
            nftId: 'nft-1',
            title: 'Cyber Samurai #01',
            collectionName: 'Cyber Samurais',
            mediaUrl: '/assets/nfts/nft-01.png',
            unitPriceEth: '1.0',
            quantity: 1,
            availableQuantity: 5,
            maxPerOrder: 5,
            subtotalEth: '1.0',
          },
        ],
        subtotalEth: '1.0',
        discountEth: '0.1',
        networkFeeEth: '0.005',
        totalEth: '0.905',
        appliedCoupon: {
          code: 'KURIO10',
          discountPercentage: 10,
          discountEth: '0.1',
        },
        isAvailable: true,
        priceChanged: false,
        unavailableItems: [],
      }
      expect(QuoteResponseSchema.safeParse(quote).success).toBe(true)
    })
  })

  describe('Order & Idempotency', () => {
    it('deve validar requisição de pedido com quoteId e expectedTotalEth', () => {
      const req = {
        quoteId: 'quote-100',
        walletAddress: '0x1234567890123456789012345678901234567890',
        network: 'Ethereum Mainnet',
        buyer: {
          name: 'Guilherme',
          email: 'guilherme@example.com',
        },
        expectedTotalEth: '0.905',
      }
      expect(CreateOrderRequestSchema.safeParse(req).success).toBe(true)
    })

    it('deve validar snapshot imutável do recibo de pedido', () => {
      const receipt = {
        orderId: 'order-12345',
        idempotencyKey: 'idem-abc-123',
        status: 'confirmed',
        createdAt: '2026-10-24T12:00:00.000Z',
        confirmedAt: '2026-10-24T12:00:05.000Z',
        transactionHash:
          '0x1234567890123456789012345678901234567890123456789012345678901234',
        network: 'Ethereum Mainnet',
        walletAddress: '0x1234567890123456789012345678901234567890',
        buyer: {
          name: 'Guilherme',
          email: 'guilherme@example.com',
        },
        items: [
          {
            nftId: 'nft-1',
            title: 'Cyber Samurai #01',
            collectionName: 'Cyber Samurais',
            mediaUrl: '/assets/nfts/nft-01.png',
            quantity: 1,
            unitPriceEth: '1.0',
            subtotalEth: '1.0',
          },
        ],
        subtotalEth: '1.0',
        discountEth: '0.1',
        networkFeeEth: '0.005',
        totalEth: '0.905',
        version: 2,
      }
      expect(OrderReceiptSchema.safeParse(receipt).success).toBe(true)
    })
  })

  describe('Auth & Form Validation', () => {
    it('deve exigir confirmação de senha idêntica no cadastro', () => {
      const valid = {
        name: 'Guilherme',
        email: 'gui@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      }
      expect(RegisterRequestSchema.safeParse(valid).success).toBe(true)

      const invalid = {
        ...valid,
        confirmPassword: 'password999',
      }
      expect(RegisterRequestSchema.safeParse(invalid).success).toBe(false)
    })

    it('deve validar troca de senha com confirmação correta', () => {
      const valid = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmNewPassword: 'newpassword123',
      }
      expect(ChangePasswordRequestSchema.safeParse(valid).success).toBe(true)
    })
  })

  describe('Realtime Events (eventId & version)', () => {
    it('deve validar nft.updated com eventId UUID e version positiva', () => {
      const event = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        version: 3,
        timestamp: '2026-10-24T12:00:00.000Z',
        nftId: 'nft-1',
        priceEth: '0.55',
        availableQuantity: 2,
        status: 'low_stock',
      }
      expect(NftUpdatedEventPayloadSchema.safeParse(event).success).toBe(true)
    })

    it('deve rejeitar evento sem eventId no formato UUID', () => {
      const invalidEvent = {
        eventId: 'not-a-uuid',
        version: 1,
        timestamp: '2026-10-24T12:00:00.000Z',
        nftId: 'nft-1',
        priceEth: '0.55',
        availableQuantity: 2,
        status: 'available',
      }
      expect(NftUpdatedEventPayloadSchema.safeParse(invalidEvent).success).toBe(false)
    })

    it('deve validar order.updated com eventId e version', () => {
      const orderEvent = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        version: 2,
        timestamp: '2026-10-24T12:00:01.000Z',
        orderId: 'order-12345',
        status: 'confirmed',
        transactionHash:
          '0x1234567890123456789012345678901234567890123456789012345678901234',
      }
      expect(OrderUpdatedEventPayloadSchema.safeParse(orderEvent).success).toBe(true)
    })
  })

  describe('ApiErrorResponseSchema', () => {
    it('deve validar respostas de erro da API padronizadas', () => {
      const error = {
        code: 'PRICE_CHANGED',
        message: 'O preço do NFT foi alterado por outro comprador.',
        timestamp: '2026-10-24T12:00:00.000Z',
        requestId: 'req-abc-123',
      }
      expect(ApiErrorResponseSchema.safeParse(error).success).toBe(true)
    })
  })
})
