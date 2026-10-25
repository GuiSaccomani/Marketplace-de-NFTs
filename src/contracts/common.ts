/**
 * KURIO Contracts: Schemas comuns, utilitários de paginação e validação monetária.
 */
import { z } from 'zod'
import { isValidEthAmountString } from '@/domain/money'

/**
 * Schema Zod para valores financeiros em ETH.
 * Garante string decimal não-negativa com até 18 casas decimais.
 */
export const EthAmountSchema = z
  .string()
  .refine(isValidEthAmountString, {
    message: 'Valor em ETH deve ser uma string decimal não-negativa com até 18 casas decimais.',
  })

export type EthAmount = z.infer<typeof EthAmountSchema>

/**
 * Parâmetros padrão de paginação para listagens.
 */
export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
})

export type PaginationParams = z.infer<typeof PaginationParamsSchema>

/**
 * Envelope padrão para respostas paginadas.
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  })
}

/**
 * Schema para validação de cabeçalho de Idempotência.
 */
export const IdempotencyHeaderSchema = z.object({
  'idempotency-key': z.string().min(1, 'Chave de idempotência obrigatória'),
})

export type IdempotencyHeader = z.infer<typeof IdempotencyHeaderSchema>
