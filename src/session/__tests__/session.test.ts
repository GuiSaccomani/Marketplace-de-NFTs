import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { server } from '@/mocks/server'
import { mockDb } from '@/mocks/state/db'
import { mockScenarioManager } from '@/mocks/state/scenarios'
import { sessionManager, sessionStore } from '@/session'
import { profileService, setAccessToken } from '@/services'

describe('Gerenciamento de Sessão e Autenticação (Etapa 06)', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
    mockDb.reset()
    mockScenarioManager.reset()
    sessionStore.reset()
    setAccessToken(null)
  })

  afterAll(() => {
    server.close()
  })

  it('deve inicializar a sessão com o usuário simulado ativo no MSW', async () => {
    const state = await sessionManager.initSession()
    expect(state.status).toBe('authenticated')
    expect(state.user?.email).toBe('colecionador@kurio.test')
    expect(state.isSessionExpired).toBe(false)
  })

  it('deve definir status como unauthenticated quando a sessão estiver vazia sem causar loop', async () => {
    // Simula logout inicial no mockDb
    mockDb.currentSessionUserId = null

    const state = await sessionManager.initSession()
    expect(state.status).toBe('unauthenticated')
    expect(state.user).toBeNull()
    expect(state.isSessionExpired).toBe(false)
  })

  it('deve executar o ciclo completo de login, validação de estado e logout com purga de cache', async () => {
    mockDb.currentSessionUserId = null
    const cacheClearSpy = vi.fn()
    const unregister = sessionManager.registerCacheClearCallback(cacheClearSpy)

    // 1. Estado inicial deslogado
    expect(sessionStore.getState().status).toBe('unauthenticated')

    // 2. Login
    const user = await sessionManager.login({
      email: 'akiro@kurio.test',
      password: 'senha123',
    })
    expect(user.id).toBe('user-02')
    expect(sessionStore.getState().status).toBe('authenticated')
    expect(sessionStore.getState().user?.email).toBe('akiro@kurio.test')

    // 3. Logout
    await sessionManager.logout()
    expect(sessionStore.getState().status).toBe('unauthenticated')
    expect(sessionStore.getState().user).toBeNull()

    // 4. Garante que a limpeza de cache privado foi disparada para proteger dados do usuário
    expect(cacheClearSpy).toHaveBeenCalledTimes(1)

    unregister()
  })

  it('deve expirar a sessão e purgar o cache ao receber resposta 401 de endpoint protegido', async () => {
    const cacheClearSpy = vi.fn()
    const unregister = sessionManager.registerCacheClearCallback(cacheClearSpy)

    // Inicializa autenticado
    await sessionManager.initSession()
    expect(sessionStore.getState().status).toBe('authenticated')

    // Força cenário unauthorized em requisição de perfil protegida
    mockScenarioManager.setScenario('unauthorized')

    try {
      await profileService.getProfile()
      expect.unreachable('Deveria ter lançado 401')
    } catch {
      // O interceptor do cliente Axios deve acionar handleSessionExpired
      const state = sessionStore.getState()
      expect(state.status).toBe('unauthenticated')
      expect(state.isSessionExpired).toBe(true)
      expect(state.user).toBeNull()
      expect(cacheClearSpy).toHaveBeenCalled()
    }

    unregister()
  })

  it('não deve disparar expiração ou loops ao receber erro na checagem de sessão em si', async () => {
    mockScenarioManager.setScenario('unauthorized')

    // A chamada a initSession falha silenciosamente definindo status unauthenticated sem loop
    const state = await sessionManager.initSession()
    expect(state.status).toBe('unauthenticated')
    expect(state.isSessionExpired).toBe(false)
  })
})
