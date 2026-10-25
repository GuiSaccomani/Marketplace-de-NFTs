import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { server } from '../server'
import { mockDb } from '../state/db'
import { mockScenarioManager } from '../state/scenarios'
import {
  PaginatedNftsResponseSchema,
  NftSchema,
  CollectionDetailSchema,
  CartSchema,
  QuoteResponseSchema,
  OrderReceiptSchema,
  AuthResponseSchema,
  SessionResponseSchema,
  SessionUserSchema,
  WalletListResponseSchema,
} from '@/contracts'

const BASE_URL = 'http://localhost'

function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, init)
}

describe('MSW Handlers & Cenários Determinísticos (Etapa 05)', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
    mockDb.reset()
    mockScenarioManager.clearScenario()
  })

  afterAll(() => {
    server.close()
  })

  describe('Autenticação e Sessão (/api/auth)', () => {
    it('deve realizar login com sucesso retornando token JWT e perfil do usuário', async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'colecionador@kurio.test',
          password: 'senha123',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      const parsed = AuthResponseSchema.safeParse(data)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.user.email).toBe('colecionador@kurio.test')
        expect(parsed.data.token).toBe('mock-jwt-token-user-01')
      }
    })

    it('deve rejeitar login com senha incorreta (401 UNAUTHORIZED)', async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'colecionador@kurio.test',
          password: 'senha-errada-123',
        }),
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('deve cadastrar um novo usuário com sucesso (201)', async () => {
      const res = await api('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Novo Colecionador',
          email: 'novo@kurio.test',
          password: 'SenhaForte123!',
          confirmPassword: 'SenhaForte123!',
        }),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      const parsed = AuthResponseSchema.safeParse(data)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.user.email).toBe('novo@kurio.test')
        expect(parsed.data.token).toBeDefined()
      }
    })

    it('deve rejeitar cadastro de email duplicado (409 CONFLICT)', async () => {
      const res = await api('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Guilherme Duplicado',
          email: 'colecionador@kurio.test',
          password: 'senha123',
          confirmPassword: 'senha123',
        }),
      })

      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.code).toBe('CONFLICT')
    })

    it('deve rejeitar cadastro quando senhas não coincidem (400 VALIDATION_ERROR)', async () => {
      const res = await api('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Teste Senha',
          email: 'teste@kurio.test',
          password: 'senha123',
          confirmPassword: 'senha-diferente',
        }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('deve retornar a sessão do usuário autenticado via Bearer token', async () => {
      const res = await api('/api/auth/session', {
        headers: { Authorization: 'Bearer mock-jwt-token-user-01' },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      const parsed = SessionResponseSchema.safeParse(data)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.isAuthenticated).toBe(true)
        expect(parsed.data.user?.id).toBe('user-01')
      }
    })

    it('deve retornar 401 determinístico quando acionado cenário unauthorized', async () => {
      const res = await api('/api/auth/session', {
        headers: { 'x-mock-scenario': 'unauthorized' },
      })
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('deve encerrar a sessão no logout (200)', async () => {
      const res = await api('/api/auth/logout', { method: 'POST' })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
    })
  })

  describe('Catálogo e Detalhes de NFTs (/api/nfts)', () => {
    it('deve retornar a lista de NFTs paginada conforme o schema', async () => {
      const res = await api('/api/nfts?page=1&limit=6')
      expect(res.status).toBe(200)
      const data = await res.json()

      const parsed = PaginatedNftsResponseSchema.safeParse(data)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.items.length).toBe(6)
        expect(parsed.data.total).toBe(12)
        expect(parsed.data.totalPages).toBe(2)
        expect(parsed.data.hasMore).toBe(true)
      }
    })

    it('deve filtrar NFTs por busca textual de título', async () => {
      const res = await api('/api/nfts?search=Ronin')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.items.length).toBeGreaterThan(0)
      expect(data.items.every((n: { title: string }) => /ronin/i.test(n.title))).toBe(true)
    })

    it('deve ordenar NFTs por preço decrescente com precisão ETH', async () => {
      const res = await api('/api/nfts?sort=price_desc&limit=12')
      expect(res.status).toBe(200)
      const data = await res.json()

      const prices = data.items.map((n: { priceEth: string }) => parseFloat(n.priceEth))
      for (let i = 0; i < prices.length - 1; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i + 1]!)
      }
    })

    it('deve responder lista vazia determinística quando cenário empty_nfts for ativado', async () => {
      const res = await api('/api/nfts', {
        headers: { 'x-mock-scenario': 'empty_nfts' },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.items).toEqual([])
      expect(data.total).toBe(0)
    })

    it('deve responder 503 determinístico quando cenário transient_error for ativado', async () => {
      const res = await api('/api/nfts', {
        headers: { 'x-mock-scenario': 'transient_error' },
      })
      expect(res.status).toBe(503)
      const data = await res.json()
      expect(data.code).toBe('TRANSIENT_ERROR')
    })

    it('deve retornar detalhes completos de um NFT existente', async () => {
      const res = await api('/api/nfts/nft-03')
      expect(res.status).toBe(200)
      const data = await res.json()

      const parsed = NftSchema.safeParse(data)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.id).toBe('nft-03')
        expect(parsed.data.priceEth).toBe('0.45')
      }
    })

    it('deve retornar 404 para NFT inexistente', async () => {
      const res = await api('/api/nfts/nft-inexistente-999')
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.code).toBe('NOT_FOUND')
    })
  })

  describe('Coleções (/api/collections)', () => {
    it('deve listar todas as coleções do marketplace', async () => {
      const res = await api('/api/collections')
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(10)
      expect(CollectionDetailSchema.safeParse(data[0]).success).toBe(true)
    })

    it('deve retornar detalhes de uma coleção pelo ID ou Slug', async () => {
      const res = await api('/api/collections/col-01')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('col-01')
      expect(data.slug).toBe('cyber-samurais')
      expect(CollectionDetailSchema.safeParse(data).success).toBe(true)
    })

    it('deve retornar 404 para coleção inexistente', async () => {
      const res = await api('/api/collections/col-desconhecida')
      expect(res.status).toBe(404)
    })
  })

  describe('Favoritos (/api/favorites)', () => {
    const authHeaders = { Authorization: 'Bearer mock-jwt-token-user-01' }

    it('deve listar os NFTs favoritos do usuário autenticado', async () => {
      const res = await api('/api/favorites', { headers: authHeaders })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data.items)).toBe(true)
      expect(data.items.length).toBeGreaterThan(0)
    })

    it('deve alternar favorito (desfavoritar e re-favoritar)', async () => {
      // 1. Desfavoritar nft-05 (que já está nos favoritos de user-01)
      const res1 = await api('/api/favorites/toggle', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nftId: 'nft-05' }),
      })
      expect(res1.status).toBe(200)
      const data1 = await res1.json()
      expect(data1.isFavorite).toBe(false)

      // 2. Re-favoritar nft-05
      const res2 = await api('/api/favorites/toggle', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nftId: 'nft-05' }),
      })
      expect(res2.status).toBe(200)
      const data2 = await res2.json()
      expect(data2.isFavorite).toBe(true)
    })
  })

  describe('Carrinho e Cupons (/api/cart & /api/coupons)', () => {
    const authHeaders = { Authorization: 'Bearer mock-jwt-token-user-01' }

    it('deve consultar o carrinho e adicionar item preservando precisão em ETH', async () => {
      const getRes = await api('/api/cart', { headers: authHeaders })
      expect(getRes.status).toBe(200)
      const initialCart = await getRes.json()
      expect(CartSchema.safeParse(initialCart).success).toBe(true)

      // Adiciona nft-04 (0.65 ETH)
      const addRes = await api('/api/cart/items', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nftId: 'nft-04', quantity: 1 }),
      })
      expect(addRes.status).toBe(200)
      const updatedCart = await addRes.json()

      // nft-03 (0.45) + nft-04 (0.65) = 1.1 ETH exato
      expect(updatedCart.itemCount).toBe(2)
      expect(updatedCart.subtotalEth).toBe('1.1')
    })

    it('deve remover item do carrinho e atualizar totais', async () => {
      const delRes = await api('/api/cart/items/nft-03', {
        method: 'DELETE',
        headers: authHeaders,
      })
      expect(delRes.status).toBe(200)
      const data = await delRes.json()
      expect(data.items.length).toBe(0)
      expect(data.subtotalEth).toBe('0')
    })

    it('deve aplicar cupom válido KURIO10 retornando 10% de desconto', async () => {
      const res = await api('/api/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'KURIO10' }),
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.code).toBe('KURIO10')
      expect(data.discountPercentage).toBe(10)
    })

    it('deve rejeitar cupom expirado EXPIRED50 com 422 COUPON_EXPIRED', async () => {
      const res = await api('/api/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'EXPIRED50' }),
      })
      expect(res.status).toBe(422)
      const data = await res.json()
      expect(data.code).toBe('COUPON_EXPIRED')
    })
  })

  describe('Cotação (/api/quote)', () => {
    it('deve gerar cotação determinística e válida com itens e cupom', async () => {
      const res = await api('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ nftId: 'nft-03', quantity: 1 }],
          couponCode: 'KURIO10',
          network: 'Ethereum Mainnet',
          walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      const parsed = QuoteResponseSchema.safeParse(data)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        // nft-03 = 0.45 ETH
        expect(parsed.data.subtotalEth).toBe('0.45')
        // 10% de 0.45 = 0.045 ETH
        expect(parsed.data.discountEth).toBe('0.045')
        // 0.45 - 0.045 + 0.005 (taxa ethereum) = 0.41 ETH
        expect(parsed.data.totalEth).toBe('0.41')
      }
    })

    it('deve acionar cenário determinístico price_changed (409)', async () => {
      const res = await api('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-scenario': 'price_changed',
        },
        body: JSON.stringify({
          items: [{ nftId: 'nft-03', quantity: 1 }],
          network: 'Ethereum Mainnet',
          walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        }),
      })

      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.code).toBe('PRICE_CHANGED')
    })

    it('deve acionar cenário determinístico out_of_stock (409)', async () => {
      const res = await api('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-scenario': 'out_of_stock',
        },
        body: JSON.stringify({
          items: [{ nftId: 'nft-03', quantity: 1 }],
          network: 'Ethereum Mainnet',
          walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        }),
      })

      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.code).toBe('OUT_OF_STOCK')
    })
  })

  describe('Pedidos e Idempotência (/api/orders)', () => {
    const authHeaders = {
      Authorization: 'Bearer mock-jwt-token-user-01',
      'Content-Type': 'application/json',
      'idempotency-key': 'idem-key-teste-alpha-1',
    }

    const orderPayload = {
      quoteId: 'quote-valid-123',
      walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
      network: 'Ethereum Mainnet',
      buyer: {
        name: 'Guilherme Colecionador',
        email: 'colecionador@kurio.test',
      },
      expectedTotalEth: '0.455',
    }

    it('deve criar um novo pedido com status confirmed e persistir o snapshot', async () => {
      const res = await api('/api/orders', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(orderPayload),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      const parsed = OrderReceiptSchema.safeParse(data)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.status).toBe('confirmed')
        expect(parsed.data.transactionHash).toBeDefined()
        expect(parsed.data.items.length).toBe(1)
      }
    })

    it('deve reproduzir exatamente o mesmo pedido se a mesma idempotency-key e payload forem enviados (Replay Seguro)', async () => {
      const replayKey = 'idem-replay-key-safe-999'
      const headers = { ...authHeaders, 'idempotency-key': replayKey }

      // 1ª chamada
      const res1 = await api('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(orderPayload),
      })
      expect(res1.status).toBe(201)
      const data1 = await res1.json()

      // 2ª chamada (replay)
      const res2 = await api('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(orderPayload),
      })
      expect(res2.status).toBe(200)
      const data2 = await res2.json()
      expect(data2.orderId).toBe(data1.orderId)
      expect(data2.transactionHash).toBe(data1.transactionHash)
    })

    it('deve acusar conflito (409 IDEMPOTENCY_CONFLICT) se a mesma idempotency-key for reutilizada com payload diferente', async () => {
      const conflictKey = 'idem-conflict-key-unique-777'
      const headers = { ...authHeaders, 'idempotency-key': conflictKey }

      // 1ª chamada com payload 1
      await api('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(orderPayload),
      })

      // 2ª chamada com payload diferente
      const resConflict = await api('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...orderPayload,
          expectedTotalEth: '1.99',
        }),
      })

      expect(resConflict.status).toBe(409)
      const conflictData = await resConflict.json()
      expect(conflictData.code).toBe('IDEMPOTENCY_CONFLICT')
    })

    it('deve simular rejeição de pagamento quando acionado cenário payment_rejected', async () => {
      const res = await api('/api/orders', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'idempotency-key': 'idem-failed-payment-000',
          'x-mock-scenario': 'payment_rejected',
        },
        body: JSON.stringify(orderPayload),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.status).toBe('rejected')
      expect(data.rejectionReason).toContain('Saldo insuficiente')
    })

    it('deve consultar o recibo imutável por ID com hash da transação', async () => {
      const createRes = await api('/api/orders', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'idempotency-key': 'idem-receipt-query-333',
        },
        body: JSON.stringify(orderPayload),
      })
      const order = await createRes.json()

      const receiptRes = await api(`/api/orders/${order.orderId}/receipt`, {
        headers: authHeaders,
      })
      expect(receiptRes.status).toBe(200)
      const receiptData = await receiptRes.json()
      const parsed = OrderReceiptSchema.safeParse(receiptData)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.transactionHash).toBe(order.transactionHash)
      }
    })
  })

  describe('Perfil e Carteiras (/api/profile & /api/wallets)', () => {
    const authHeaders = { Authorization: 'Bearer mock-jwt-token-user-01' }

    it('deve retornar o perfil completo do usuário autenticado', async () => {
      const res = await api('/api/profile', { headers: authHeaders })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(SessionUserSchema.safeParse(data).success).toBe(true)
      expect(data.email).toBe('colecionador@kurio.test')
    })

    it('deve permitir atualizar os dados de perfil (nome e bio)', async () => {
      const res = await api('/api/profile', {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Nome Atualizado',
          bio: 'Bio atualizada com sucesso',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.name).toBe('Nome Atualizado')
      expect(data.bio).toBe('Bio atualizada com sucesso')
    })

    it('deve listar carteiras cadastradas do usuário', async () => {
      const res = await api('/api/wallets', { headers: authHeaders })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(WalletListResponseSchema.safeParse(data).success).toBe(true)
      expect(data.wallets.length).toBeGreaterThan(0)
    })
  })
})
