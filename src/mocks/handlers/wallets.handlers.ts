/**
 * KURIO Mocks: Handlers REST para Carteiras e Redes.
 */
import { http, HttpResponse } from 'msw'
import {
  SaveWalletRequestSchema,
  type WalletListResponse,
  type WalletAccount,
  type ApiErrorResponse,
} from '@/contracts'
import { mockDb, resolveAuthenticatedUser } from '../state/db'
import { mockScenarioManager } from '../state/scenarios'

export const walletsHandlers = [
  // Listar carteiras do usuário
  http.get('*/api/wallets', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)
    const user = resolveAuthenticatedUser(request)

    if (scenario === 'unauthorized' || !user) {
      const error: ApiErrorResponse = {
        code: 'UNAUTHORIZED',
        message: 'Acesso não autorizado às carteiras.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 401 })
    }

    const userWallets = mockDb.wallets[user.id] ?? []
    const response: WalletListResponse = {
      wallets: userWallets,
      activeNetwork: 'ethereum_mainnet',
    }

    return HttpResponse.json(response, { status: 200 })
  }),

  // Cadastrar nova carteira
  http.post('*/api/wallets', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)
    const user = resolveAuthenticatedUser(request)

    if (scenario === 'unauthorized' || !user) {
      const error: ApiErrorResponse = {
        code: 'UNAUTHORIZED',
        message: 'Faça login para cadastrar carteiras.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parseResult = SaveWalletRequestSchema.safeParse(body)

    if (!parseResult.success) {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Dados de carteira inválidos.',
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const { address, label, type, network } = parseResult.data
    const userId = user.id
    const userWallets = mockDb.wallets[userId] ?? []

    const newWallet: WalletAccount = {
      id: `wal-${Date.now()}`,
      address,
      label,
      type,
      network,
      balanceEth: '10.0', // saldo inicial simulado
      status: 'connected',
      isDefault: type === 'primary',
      createdAt: new Date().toISOString(),
    }

    if (type === 'primary') {
      userWallets.forEach((w) => {
        if (w.type === 'primary') w.type = 'secondary'
      })
    }

    userWallets.push(newWallet)
    mockDb.wallets[userId] = userWallets

    return HttpResponse.json(newWallet, { status: 201 })
  }),
]
