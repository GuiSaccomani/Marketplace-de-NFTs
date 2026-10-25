/**
 * KURIO Mocks: Handlers REST para Autenticação e Sessão.
 */
import { http, HttpResponse } from 'msw'
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  type AuthResponse,
  type SessionResponse,
  type ApiErrorResponse,
} from '@/contracts'
import { mockDb } from '../state/db'
import { mockScenarioManager } from '../state/scenarios'

export const authHandlers = [
  // Cadastro de novo colecionador
  http.post('*/api/auth/register', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)
    if (scenario === 'transient_error') {
      const error: ApiErrorResponse = {
        code: 'TRANSIENT_ERROR',
        message: 'Serviço temporariamente indisponível. Tente novamente.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 503 })
    }

    const body = await request.json().catch(() => null)
    const parseResult = RegisterRequestSchema.safeParse(body)

    if (!parseResult.success) {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Dados de cadastro inválidos.',
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const { name, email, password } = parseResult.data
    const existing = mockDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase())

    if (existing) {
      const error: ApiErrorResponse = {
        code: 'CONFLICT',
        message: 'Este e-mail já está cadastrado.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 409 })
    }

    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      passwordHash: password,
      avatarUrl: undefined as string | undefined,
      bio: '',
      createdAt: new Date().toISOString(),
      token: `mock-token-${Date.now()}`,
    }

    mockDb.users.push(newUser)
    mockDb.currentSessionUserId = newUser.id

    const response: AuthResponse = {
      token: newUser.token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatarUrl: newUser.avatarUrl,
        bio: newUser.bio,
        createdAt: newUser.createdAt,
      },
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24h
    }

    return HttpResponse.json(response, { status: 201 })
  }),

  // Login de colecionador
  http.post('*/api/auth/login', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)
    if (scenario === 'transient_error') {
      const error: ApiErrorResponse = {
        code: 'TRANSIENT_ERROR',
        message: 'Falha temporária de comunicação com o servidor.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 503 })
    }

    const body = await request.json().catch(() => null)
    const parseResult = LoginRequestSchema.safeParse(body)

    if (!parseResult.success) {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'E-mail ou senha em formato inválido.',
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const { email, password } = parseResult.data
    const user = mockDb.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password,
    )

    if (!user) {
      const error: ApiErrorResponse = {
        code: 'UNAUTHORIZED',
        message: 'Credenciais inválidas. Verifique seu e-mail e senha.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 401 })
    }

    mockDb.currentSessionUserId = user.id

    const response: AuthResponse = {
      token: user.token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    }

    return HttpResponse.json(response, { status: 200 })
  }),

  // Consulta da sessão atual
  http.get('*/api/auth/session', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)

    if (scenario === 'unauthorized') {
      const error: ApiErrorResponse = {
        code: 'UNAUTHORIZED',
        message: 'Autenticação necessária para acessar este recurso.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 401 })
    }

    if (scenario === 'session_expired') {
      mockDb.currentSessionUserId = null
      const error: ApiErrorResponse = {
        code: 'SESSION_EXPIRED',
        message: 'Sua sessão expirou. Faça login novamente.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 401 })
    }

    const authHeader = request.headers.get('Authorization')
    let user = mockDb.users.find((u) => u.id === mockDb.currentSessionUserId)

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim()
      const tokenUser = mockDb.users.find((u) => u.token === token)
      if (tokenUser) user = tokenUser
    }

    const response: SessionResponse = {
      isAuthenticated: Boolean(user),
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            createdAt: user.createdAt,
          }
        : null,
    }

    return HttpResponse.json(response, { status: 200 })
  }),

  // Logout
  http.post('*/api/auth/logout', async () => {
    mockDb.currentSessionUserId = null
    return HttpResponse.json({ ok: true }, { status: 200 })
  }),
]
