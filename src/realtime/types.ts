/**
 * KURIO Realtime: Tipos e Estados da Conexão em Tempo Real.
 */
import type {
  NftUpdatedEventPayload,
  OrderUpdatedEventPayload,
} from '@/contracts'

export type RealtimeConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'

export type RealtimeEvent =
  | { type: 'nft.updated'; payload: NftUpdatedEventPayload }
  | { type: 'order.updated'; payload: OrderUpdatedEventPayload }

export interface RealtimeState {
  status: RealtimeConnectionStatus
  lastEvent: RealtimeEvent | null
  lastConnectedAt: string | null
}
