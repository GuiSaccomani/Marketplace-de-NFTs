/**
 * KURIO Mocks: Handlers REST para Perfil do Colecionador.
 */
import { http, HttpResponse } from 'msw'
import {
  UpdateProfileRequestSchema,
  ChangePasswordRequestSchema,
  type SessionUser,
  type ApiErrorResponse,
} from '@/contracts'
import { resolveAuthenticatedUser } from '../state/db'
import { mockScenarioManager } from '../state/scenarios'

export const profileHandlers = [
  // Consulta do perfil
  http.get('*/api/profile', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)
    const user = resolveAuthenticatedUser(request)

    if (scenario === 'unauthorized' || !user) {
      const error: ApiErrorResponse = {
        code: 'UNAUTHORIZED',
        message: 'Acesso não autorizado ao perfil.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 401 })
    }

    const profile: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
    }

    return HttpResponse.json(profile, { status: 200 })
  }),

  // Atualização do perfil
  http.put('*/api/profile', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)
    const user = resolveAuthenticatedUser(request)

    if (scenario === 'unauthorized' || !user) {
      const error: ApiErrorResponse = {
        code: 'UNAUTHORIZED',
        message: 'Faça login para editar seu perfil.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parseResult = UpdateProfileRequestSchema.safeParse(body)

    if (!parseResult.success) {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Dados de perfil inválidos.',
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const { name, bio, avatarUrl } = parseResult.data
    user.name = name
    if (bio !== undefined) user.bio = bio
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl

    const updatedProfile: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
    }

    return HttpResponse.json(updatedProfile, { status: 200 })
  }),

  // Alteração de senha
  http.post('*/api/profile/password', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)
    const user = resolveAuthenticatedUser(request)

    if (scenario === 'unauthorized' || !user) {
      const error: ApiErrorResponse = {
        code: 'UNAUTHORIZED',
        message: 'Faça login para alterar sua senha.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parseResult = ChangePasswordRequestSchema.safeParse(body)

    if (!parseResult.success) {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Confirmação de nova senha inválida.',
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const { currentPassword, newPassword } = parseResult.data
    if (user.passwordHash !== currentPassword) {
      const error: ApiErrorResponse = {
        code: 'UNAUTHORIZED',
        message: 'A senha atual informada está incorreta.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 401 })
    }

    user.passwordHash = newPassword
    return HttpResponse.json({ ok: true, message: 'Senha alterada com sucesso.' }, { status: 200 })
  }),
]
