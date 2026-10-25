import type { SessionUser } from '@/contracts'

export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

export interface SessionState {
  status: SessionStatus
  user: SessionUser | null
  isSessionExpired: boolean
  error: string | null
}

const INITIAL_STATE: SessionState = {
  status: 'idle',
  user: null,
  isSessionExpired: false,
  error: null,
}

class SessionStore {
  private state: SessionState = { ...INITIAL_STATE }
  private listeners = new Set<() => void>()

  public getState(): SessionState {
    return this.state
  }

  public setState(patch: Partial<SessionState>): void {
    this.state = {
      ...this.state,
      ...patch,
    }
    this.notify()
  }

  public reset(): void {
    this.state = { ...INITIAL_STATE, status: 'unauthenticated' }
    this.notify()
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener()
      } catch (err) {
        console.error('[SessionStore] Erro ao notificar listener:', err)
      }
    }
  }
}

export const sessionStore = new SessionStore()
