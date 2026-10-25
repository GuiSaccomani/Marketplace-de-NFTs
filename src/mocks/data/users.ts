/**
 * KURIO Mocks: Fixtures de Usuários para simulação determinística.
 * Disponibiliza 2 usuários completos para testar isolamento de sessão e troca de conta.
 */
import type { SessionUser } from '@/contracts'

export interface MockUserRecord extends SessionUser {
  passwordHash: string
  token: string
}

export const MOCK_USERS: MockUserRecord[] = [
  {
    id: 'user-01',
    name: 'Guilherme Colecionador',
    email: 'colecionador@kurio.test',
    passwordHash: 'senha123',
    bio: 'Colecionador ávido de arte digital cyberpunk e edições raras na Ethereum.',
    createdAt: '2026-01-15T10:00:00.000Z',
    token: 'mock-jwt-token-user-01',
  },
  {
    id: 'user-02',
    name: 'Akiro Artista',
    email: 'akiro@kurio.test',
    passwordHash: 'senha123',
    avatarUrl: '/assets/collections/collection-01.png',
    bio: 'Artista 3D pioneiro em avatares mecha e estética neotóquio.',
    createdAt: '2026-02-20T14:30:00.000Z',
    token: 'mock-jwt-token-user-02',
  },
]
