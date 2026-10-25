import React, { createContext, useContext, useSyncExternalStore } from 'react'
import { realtimeClient } from './realtime-client'
import type { RealtimeState } from './types'

const RealtimeContext = createContext<RealtimeState | null>(null)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(
    (listener) => realtimeClient.subscribe(listener),
    () => realtimeClient.getState(),
  )

  return <RealtimeContext.Provider value={state}>{children}</RealtimeContext.Provider>
}

/**
 * Hook para acessar o estado da conexão em tempo real da plataforma KURIO.
 */
export function useRealtime(): RealtimeState {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime deve ser utilizado dentro de um <RealtimeProvider>.')
  }
  return context
}
