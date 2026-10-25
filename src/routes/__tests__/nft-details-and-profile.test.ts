import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { server } from '@/mocks/server'
import { mockDb } from '@/mocks/state/db'
import { mockScenarioManager } from '@/mocks/state/scenarios'
import {
  nftsService,
  profileService,
  walletsService,
  favoritesService,
} from '@/services'
import { setAccessToken } from '@/services/api/client'
import { ApiClientError } from '@/services/api/types'

describe('Detalhes do NFT e Perfil do Colecionador (Etapa 08)', () => {
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

  describe('Página de Detalhes do NFT', () => {
    it('deve consultar com sucesso os detalhes completos de um NFT existente', async () => {
      const nft = await nftsService.getNftById('nft-03')

      expect(nft.id).toBe('nft-03')
      expect(nft.title).toBe('Cyber Ronin #03')
      expect(nft.collection.name).toBe('Cyber Samurais')
      expect(nft.collection.verified).toBe(true)
      expect(nft.priceEth).toBe('0.45')
      expect(typeof nft.priceEth).toBe('string')
      expect(nft.blockchainNetwork).toBe('Ethereum Mainnet')
      expect(nft.editions.availableCount).toBe(4)
      expect(nft.editions.totalCount).toBe(10)
      expect(nft.editions.maxPerOrder).toBe(3)
      expect(nft.contractAddress).toMatch(/^0x[a-fA-F0-9]{40}$/)
      expect(nft.mediaUrl).toBeDefined()
    })

    it('deve retornar erro 404 apropriado para NFT inexistente', async () => {
      await expect(nftsService.getNftById('nft-inexistente-9999')).rejects.toThrow(
        ApiClientError,
      )

      try {
        await nftsService.getNftById('nft-inexistente-9999')
      } catch (err: unknown) {
        const apiError = err as ApiClientError
        expect(apiError.status).toBe(404)
        expect(apiError.code).toBe('NOT_FOUND')
      }
    })

    it('deve permitir alternar o status de favorito de um NFT', async () => {
      // Inicia sessão simulada
      setAccessToken('mock-jwt-token-user-01')

      // Alterna favorito de nft-03 (não estava nos favoritos de user-01)
      const res1 = await favoritesService.toggleFavorite('nft-03')
      expect(res1.isFavorite).toBe(true)

      // Lista favoritos e confirma inclusão
      const favoritesAfterAdd = await favoritesService.listFavorites()
      expect(favoritesAfterAdd.items.some((item) => item.id === 'nft-03')).toBe(true)

      // Alterna novamente para remover
      const res2 = await favoritesService.toggleFavorite('nft-03')
      expect(res2.isFavorite).toBe(false)

      const favoritesAfterRemove = await favoritesService.listFavorites()
      expect(favoritesAfterRemove.items.some((item) => item.id === 'nft-03')).toBe(false)
    })
  })

  describe('Página de Perfil do Colecionador', () => {
    it('deve consultar perfil cadastral, carteiras vinculadas e favoritos do usuário autenticado', async () => {
      setAccessToken('mock-jwt-token-user-01')

      // 1. Perfil cadastral
      const profile = await profileService.getProfile()
      expect(profile.id).toBe('user-01')
      expect(profile.name).toBe('Guilherme Colecionador')
      expect(profile.email).toBe('colecionador@kurio.test')
      expect(profile.bio).toContain('cyberpunk')

      // 2. Carteiras conectadas
      const walletsRes = await walletsService.listWallets()
      expect(walletsRes.wallets.length).toBeGreaterThan(0)
      const primaryWallet = walletsRes.wallets.find((w) => w.isDefault)
      expect(primaryWallet).toBeDefined()
      expect(primaryWallet?.address).toMatch(/^0x[a-fA-F0-9]{40}$/)
      expect(typeof primaryWallet?.balanceEth).toBe('string')

      // 3. Favoritos do perfil
      const favoritesRes = await favoritesService.listFavorites()
      expect(favoritesRes.items.length).toBeGreaterThanOrEqual(1)
    })

    it('deve permitir atualizar nome e bio do perfil', async () => {
      setAccessToken('mock-jwt-token-user-01')

      const updated = await profileService.updateProfile({
        name: 'Guilherme Atualizado',
        bio: 'Nova biografia com suporte a edições raras.',
      })

      expect(updated.name).toBe('Guilherme Atualizado')
      expect(updated.bio).toBe('Nova biografia com suporte a edições raras.')

      // Confirma que a nova consulta reflete os dados atualizados
      const fresh = await profileService.getProfile()
      expect(fresh.name).toBe('Guilherme Atualizado')
    })

    it('não deve expor dados privados de perfil para requisições não autorizadas (visitante)', async () => {
      // Sem token configurado e com cenário de não autorização
      mockScenarioManager.setScenario('unauthorized')

      await expect(profileService.getProfile()).rejects.toThrow(ApiClientError)

      try {
        await profileService.getProfile()
      } catch (err: unknown) {
        const apiError = err as ApiClientError
        expect(apiError.status).toBe(401)
      }
    })
  })
})
