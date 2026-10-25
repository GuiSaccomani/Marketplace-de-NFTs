import React, { createContext, useContext, useSyncExternalStore } from 'react'
import { sessionStore, type SessionState } from './session-store'
import { sessionManager } from './session-manager'
import type { LoginRequest, RegisterRequest, SessionUser } from '@/contracts'

export interface SessionContextValue extends SessionState {
  login: (credentials: LoginRequest) => Promise<SessionUser>
  register: (data: RegisterRequest) => Promise<SessionUser>
  logout: () => Promise<void>
  refreshSession: () => Promise<SessionState>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(
    (listener) => sessionStore.subscribe(listener),
    () => sessionStore.getState(),
  )

  const value: SessionContextValue = {
    ...state,
    login: (credentials) => sessionManager.login(credentials),
    register: (data) => sessionManager.register(data),
    logout: () => sessionManager.logout(),
    refreshSession: () => sessionManager.initSession(),
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

/**
 * Hook para acessar o estado e ações da sessão do usuário autenticado.
 */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession deve ser utilizado dentro de um <SessionProvider>.')
  }
  return context
}
