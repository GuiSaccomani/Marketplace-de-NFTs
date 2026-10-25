import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { server } from '@/mocks/server'
import { mockDb } from '@/mocks/state/db'
import { mockScenarioManager } from '@/mocks/state/scenarios'
import {
  authService,
  nftsService,
  collectionsService,
  favoritesService,
  cartService,
  couponsService,
  quoteService,
  ordersService,
  profileService,
  walletsService,
  ApiClientError,
  setAccessToken,
  getAccessToken,
} from '@/services'

describe('Camada de Serviços de API (Etapa 06)', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
    mockDb.reset()
    mockScenarioManager.reset()
    setAccessToken(null)
  })

  afterAll(() => {
    server.close()
  })

  describe('authService', () => {
    it('deve realizar login, armazenar o token em memória e retornar usuário', async () => {
      const response = await authService.login({
        email: 'colecionador@kurio.test',
        password: 'senha123',
      })

      expect(response.user.email).toBe('colecionador@kurio.test')
      expect(response.token).toBe('mock-jwt-token-user-01')
      expect(getAccessToken()).toBe('mock-jwt-token-user-01')
    })

    it('deve lançar ApiClientError com código UNAUTHORIZED ao errar credenciais', async () => {
      try {
        await authService.login({
          email: 'colecionador@kurio.test',
          password: 'senha-incorreta',
        })
        expect.unreachable('Deveria ter lançado erro')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError)
        const apiErr = err as ApiClientError
        expect(apiErr.status).toBe(401)
        expect(apiErr.code).toBe('UNAUTHORIZED')
      }
    })

    it('deve cadastrar um novo usuário e definir o token em memória', async () => {
      const response = await authService.register({
        name: 'Novo Usuário',
        email: 'novo.usuario@kurio.test',
        password: 'SenhaForte123!',
        confirmPassword: 'SenhaForte123!',
      })

      expect(response.user.email).toBe('novo.usuario@kurio.test')
      expect(getAccessToken()).toBeDefined()
    })

    it('deve consultar a sessão ativa retornando o usuário logado', async () => {
      setAccessToken('mock-jwt-token-user-01')
      const session = await authService.getSession()
      expect(session.isAuthenticated).toBe(true)
      expect(session.user?.id).toBe('user-01')
    })

    it('deve realizar logout e limpar o token em memória', async () => {
      setAccessToken('mock-jwt-token-user-01')
      expect(getAccessToken()).toBe('mock-jwt-token-user-01')

      await authService.logout()
      expect(getAccessToken()).toBeNull()
    })
  })

  describe('nftsService & collectionsService', () => {
    it('deve listar NFTs paginados e preservar precisão de preços em ETH', async () => {
      const result = await nftsService.listNfts({ page: 1, limit: 6 })
      expect(result.items.length).toBe(6)
      expect(result.total).toBe(12)
      expect(typeof result.items[0]?.priceEth).toBe('string')
    })

    it('deve filtrar NFTs por busca textual', async () => {
      const result = await nftsService.listNfts({ search: 'Ronin' })
      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items.every((n) => /ronin/i.test(n.title))).toBe(true)
    })

    it('deve obter detalhes completos de um NFT existente', async () => {
      const nft = await nftsService.getNftById('nft-03')
      expect(nft.id).toBe('nft-03')
      expect(nft.priceEth).toBe('0.45')
      expect(nft.collection.name).toBe('Cyber Samurais')
    })

    it('deve lançar ApiClientError com status 404 para NFT inexistente', async () => {
      await expect(nftsService.getNftById('nft-fantasma')).rejects.toThrow(ApiClientError)
    })

    it('deve responder lista vazia determinística quando cenário empty_nfts for informado', async () => {
      const result = await nftsService.listNfts({}, { mockScenario: 'empty_nfts' })
      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
    })

    it('deve responder erro 503 quando cenário transient_error for informado', async () => {
      try {
        await nftsService.listNfts({}, { mockScenario: 'transient_error' })
        expect.unreachable('Deveria ter falhado')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError)
        expect((err as ApiClientError).status).toBe(503)
      }
    })

    it('deve listar coleções cadastradas', async () => {
      const collections = await collectionsService.listCollections()
      expect(collections.length).toBe(10)
      expect(collections[0]?.name).toBe('Cyber Samurais')
    })

    it('deve obter coleção por slug', async () => {
      const col = await collectionsService.getCollectionById('cyber-samurais')
      expect(col.slug).toBe('cyber-samurais')
    })
  })

  describe('favoritesService', () => {
    it('deve listar e alternar favoritos', async () => {
      setAccessToken('mock-jwt-token-user-01')

      const initial = await favoritesService.listFavorites()
      expect(Array.isArray(initial.items)).toBe(true)

      // Toggle off nft-05
      const res1 = await favoritesService.toggleFavorite('nft-05')
      expect(res1.isFavorite).toBe(false)

      // Toggle on nft-05
      const res2 = await favoritesService.toggleFavorite('nft-05')
      expect(res2.isFavorite).toBe(true)
    })
  })

  describe('cartService & couponsService', () => {
    it('deve manipular itens no carrinho preservando cálculos exatos em ETH', async () => {
      setAccessToken('mock-jwt-token-user-01')

      const cart = await cartService.getCart()
      expect(cart.items.length).toBe(1)

      // Adiciona nft-04 (0.65 ETH)
      const updated = await cartService.addToCart('nft-04', 1)
      expect(updated.itemCount).toBe(2)
      // nft-03 (0.45) + nft-04 (0.65) = 1.1 ETH
      expect(updated.subtotalEth).toBe('1.1')

      // Atualiza quantidade
      const modified = await cartService.updateCartItemQuantity('nft-03', 2)
      expect(modified.items.find((i) => i.nftId === 'nft-03')?.quantity).toBe(2)

      // Remove item
      const removed = await cartService.removeCartItem('nft-04')
      expect(removed.items.find((i) => i.nftId === 'nft-04')).toBeUndefined()
    })

    it('deve aplicar cupom válido KURIO10', async () => {
      const coupon = await couponsService.applyCoupon('KURIO10')
      expect(coupon.code).toBe('KURIO10')
      expect(coupon.discountPercentage).toBe(10)
    })

    it('deve rejeitar cupom expirado com ApiClientError 422', async () => {
      try {
        await couponsService.applyCoupon('EXPIRED50')
        expect.unreachable('Deveria ter falhado')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError)
        expect((err as ApiClientError).status).toBe(422)
        expect((err as ApiClientError).code).toBe('COUPON_EXPIRED')
      }
    })
  })

  describe('quoteService & ordersService com Idempotência', () => {
    it('deve gerar cotação exata com desconto e taxa de rede', async () => {
      const quote = await quoteService.getQuote({
        items: [{ nftId: 'nft-03', quantity: 1 }],
        couponCode: 'KURIO10',
        network: 'Ethereum Mainnet',
        walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
      })

      expect(quote.subtotalEth).toBe('0.45')
      expect(quote.discountEth).toBe('0.045')
      expect(quote.totalEth).toBe('0.41')
    })

    it('deve lançar ApiClientError 409 quando preço mudar (cenário price_changed)', async () => {
      await expect(
        quoteService.getQuote(
          {
            items: [{ nftId: 'nft-03', quantity: 1 }],
            network: 'Ethereum Mainnet',
            walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
          },
          { mockScenario: 'price_changed' },
        ),
      ).rejects.toThrow(ApiClientError)
    })

    it('deve criar pedido com idempotencyKey e permitir replay seguro', async () => {
      setAccessToken('mock-jwt-token-user-01')
      const idempotencyKey = 'idem-service-test-123'

      const payload = {
        quoteId: 'quote-valid-xyz',
        walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        network: 'Ethereum Mainnet',
        buyer: {
          name: 'Guilherme Colecionador',
          email: 'colecionador@kurio.test',
        },
        expectedTotalEth: '0.455',
      }

      // 1. Criação
      const order1 = await ordersService.createOrder(payload, idempotencyKey)
      expect(order1.status).toBe('confirmed')
      expect(order1.transactionHash).toBeDefined()

      // 2. Replay seguro com a mesma chave
      const order2 = await ordersService.createOrder(payload, idempotencyKey)
      expect(order2.orderId).toBe(order1.orderId)
      expect(order2.transactionHash).toBe(order1.transactionHash)

      // 3. Consulta por ID e Recibo
      const retrieved = await ordersService.getOrderById(order1.orderId)
      expect(retrieved.orderId).toBe(order1.orderId)

      const receipt = await ordersService.getOrderReceipt(order1.orderId)
      expect(receipt.transactionHash).toBe(order1.transactionHash)
    })

    it('deve acusar conflito de idempotência se chave for reutilizada com payload diferente', async () => {
      setAccessToken('mock-jwt-token-user-01')
      const idempotencyKey = 'idem-conflict-service-456'

      const payload1 = {
        quoteId: 'quote-valid-1',
        walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        network: 'Ethereum Mainnet',
        buyer: { name: 'Comprador A', email: 'a@kurio.test' },
        expectedTotalEth: '0.455',
      }

      await ordersService.createOrder(payload1, idempotencyKey)

      // Reutiliza chave com valor divergente
      try {
        await ordersService.createOrder(
          { ...payload1, expectedTotalEth: '9.99' },
          idempotencyKey,
        )
        expect.unreachable('Deveria ter lançado conflito de idempotência')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError)
        expect((err as ApiClientError).status).toBe(409)
        expect((err as ApiClientError).code).toBe('IDEMPOTENCY_CONFLICT')
      }
    })
  })

  describe('profileService & walletsService', () => {
    it('deve obter e atualizar perfil do colecionador', async () => {
      setAccessToken('mock-jwt-token-user-01')

      const profile = await profileService.getProfile()
      expect(profile.email).toBe('colecionador@kurio.test')

      const updated = await profileService.updateProfile({
        name: 'Guilherme Novo Nome',
        bio: 'Nova bio atualizada.',
      })
      expect(updated.name).toBe('Guilherme Novo Nome')
      expect(updated.bio).toBe('Nova bio atualizada.')
    })

    it('deve listar carteiras e salvar nova carteira', async () => {
      setAccessToken('mock-jwt-token-user-01')

      const walletsResponse = await walletsService.listWallets()
      expect(walletsResponse.wallets.length).toBeGreaterThan(0)

      const newWallet = await walletsService.saveWallet({
        address: '0x0000000000000000000000000000000000000001',
        label: 'Carteira Secundária de Teste',
        type: 'secondary',
        network: 'polygon',
      })
      expect(newWallet.address).toBe('0x0000000000000000000000000000000000000001')
      expect(newWallet.network).toBe('polygon')
    })
  })

  describe('Cancelamento de Requisição (AbortSignal)', () => {
    it('deve cancelar a requisição imediatamente ao acionar AbortController', async () => {
      const controller = new AbortController()
      controller.abort() // aborta antes da chamada

      try {
        await nftsService.listNfts({}, { signal: controller.signal })
        expect.unreachable('Deveria ter sido cancelada')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError)
        const apiErr = err as ApiClientError
        expect(apiErr.isCancelled).toBe(true)
        expect(apiErr.code).toBe('REQUEST_CANCELLED')
      }
    })
  })
})
