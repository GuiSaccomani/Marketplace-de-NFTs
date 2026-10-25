/**
 * KURIO Contracts: Eventos em Tempo Real (Socket.IO).
 *
 * Em conformidade com CHALLENGE.md (Seção 7):
 * "Os eventos devem carregar identidade estável, recurso afetado e versão.
 * O cliente deve tolerar duplicatas e eventos antigos, sem regredir um estado mais recente."
 */
import { z } from 'zod'
import { EthAmountSchema } from './common'
import { OrderStatusSchema } from './order'

/**
 * Metadados obrigatórios em todo evento em tempo real para controle de versão e idempotência.
 */
export const EventEnvelopeSchema = z.object({
  eventId: z.string().uuid('Identificador do evento deve ser um UUID estável'),
  version: z.number().int().positive('Versão deve ser um inteiro positivo e incremental'),
  timestamp: z.string().datetime(),
})

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>

/**
 * Evento emitido quando o preço ou estoque de um NFT é modificado.
 * Disparado para atualizar catálogo, detalhes e carrinho.
 */
export const NftUpdatedEventPayloadSchema = EventEnvelopeSchema.extend({
  nftId: z.string().min(1),
  priceEth: EthAmountSchema,
  availableQuantity: z.number().int().nonnegative(),
  status: z.enum(['available', 'low_stock', 'sold_out']),
})

export type NftUpdatedEventPayload = z.infer<typeof NftUpdatedEventPayloadSchema>

/**
 * Evento emitido quando o estado de um pedido em processamento é alterado (confirmação ou recusa).
 */
export const OrderUpdatedEventPayloadSchema = EventEnvelopeSchema.extend({
  orderId: z.string().min(1),
  status: OrderStatusSchema,
  transactionHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Hash de transação Ethereum inválido')
    .optional(),
  rejectionReason: z.string().optional(),
})

export type OrderUpdatedEventPayload = z.infer<
  typeof OrderUpdatedEventPayloadSchema
>

/**
 * Mapa tipado de todos os eventos de tempo real suportados pelo KURIO.
 */
export interface KurioSocketEventsMap {
  'nft.updated': (payload: NftUpdatedEventPayload) => void
  'order.updated': (payload: OrderUpdatedEventPayload) => void
}
