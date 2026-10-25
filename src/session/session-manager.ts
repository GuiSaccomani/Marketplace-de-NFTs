import { sessionStore, type SessionState } from './session-store'
import { authService } from '@/services/auth.service'
import { setOnUnauthorizedHandler, setAccessToken } from '@/services/api/client'
import type { LoginRequest, RegisterRequest, SessionUser } from '@/contracts'

type CacheClearCallback = () => void

class SessionManager {
  private cacheClearCallbacks = new Set<CacheClearCallback>()
  private isInitializing = false

  constructor() {
    // Configura o interceptor de 401 para expirar a sessão de forma segura e sem loops
    setOnUnauthorizedHandler(() => {
      this.handleSessionExpired()
    })
  }

  /**
   * Registra um callback para purgar o cache (ex: queryClient.clear() do TanStack Query)
   * ao fazer logout ou quando a sessão expirar, garantindo que nenhum dado privado permaneça.
   */
  public registerCacheClearCallback(callback: CacheClearCallback): () => void {
    this.cacheClearCallbacks.add(callback)
    return () => {
      this.cacheClearCallbacks.delete(callback)
    }
  }

  /**
   * Limpa todos os caches de dados privados registrados.
   */
  private clearPrivateCaches(): void {
    for (const callback of this.cacheClearCallbacks) {
      try {
        callback()
      } catch (err) {
        console.error('[SessionManager] Erro ao limpar cache privado:', err)
      }
    }
  }

  /**
   * Consulta a sessão ativa inicial. Não gera loops se o usuário estiver deslogado.
   */
  public async initSession(): Promise<SessionState> {
    if (this.isInitializing) {
      return sessionStore.getState()
    }

    this.isInitializing = true
    sessionStore.setState({ status: 'loading', error: null })

    try {
      const response = await authService.getSession()
      if (response.isAuthenticated && response.user) {
        sessionStore.setState({
          status: 'authenticated',
          user: response.user,
          isSessionExpired: false,
          error: null,
        })
      } else {
        sessionStore.setState({
          status: 'unauthenticated',
          user: null,
          isSessionExpired: false,
          error: null,
        })
      }
    } catch {
      // 401 ou erro de rede inicial apenas coloca como unauthenticated, sem loop
      sessionStore.setState({
        status: 'unauthenticated',
        user: null,
        isSessionExpired: false,
        error: null,
      })
    } finally {
      this.isInitializing = false
    }

    return sessionStore.getState()
  }

  /**
   * Realiza login e atualiza a sessão com o usuário autenticado.
   */
  public async login(credentials: LoginRequest): Promise<SessionUser> {
    sessionStore.setState({ status: 'loading', error: null })
    try {
      const auth = await authService.login(credentials)
      sessionStore.setState({
        status: 'authenticated',
        user: auth.user,
        isSessionExpired: false,
        error: null,
      })
      return auth.user
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao autenticar.'
      sessionStore.setState({
        status: 'unauthenticated',
        user: null,
        error: message,
      })
      throw err
    }
  }

  /**
   * Cadastra novo usuário e atualiza a sessão.
   */
  public async register(data: RegisterRequest): Promise<SessionUser> {
    sessionStore.setState({ status: 'loading', error: null })
    try {
      const auth = await authService.register(data)
      sessionStore.setState({
        status: 'authenticated',
        user: auth.user,
        isSessionExpired: false,
        error: null,
      })
      return auth.user
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao cadastrar conta.'
      sessionStore.setState({
        status: 'unauthenticated',
        user: null,
        error: message,
      })
      throw err
    }
  }

  /**
   * Encerra a sessão, descarta o token e purga todos os dados privados do cache.
   */
  public async logout(): Promise<void> {
    try {
      await authService.logout()
    } catch (err) {
      console.warn('[SessionManager] Erro no logout do servidor simulado:', err)
    } finally {
      setAccessToken(null)
      this.clearPrivateCaches()
      sessionStore.reset()
    }
  }

  /**
   * Tratamento de sessão expirada disparado pelo interceptor 401 do Axios.
   */
  public handleSessionExpired(): void {
    const currentState = sessionStore.getState()
    if (currentState.status === 'unauthenticated' && currentState.isSessionExpired) {
      return // Já está no estado expirado, evita chamadas redundantes
    }

    setAccessToken(null)
    this.clearPrivateCaches()
    sessionStore.setState({
      status: 'unauthenticated',
      user: null,
      isSessionExpired: true,
      error: 'Sua sessão expirou. Faça login novamente para continuar.',
    })
  }
}

export const sessionManager = new SessionManager()
