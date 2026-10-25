/**
 * KURIO Mocks: Gerenciador de Broadcast em Tempo Real para simulações Socket.IO no MSW.
 */
import type { NftUpdatedEventPayload, OrderUpdatedEventPayload } from '@/contracts'

// Armazena conexões ativas do @mswjs/socket.io-binding
const activeClients = new Set<any>()

export function registerMockSocket(client: any): void {
  activeClients.add(client)
}

export function unregisterMockSocket(client: any): void {
  activeClients.delete(client)
}

export function broadcastMockEvent(eventName: string, payload: unknown): number {
  let count = 0
  for (const client of activeClients) {
    try {
      client.emit(eventName, payload)
      count++
    } catch {
      // Ignora clientes com conexão fechada
    }
  }
  return count
}

export function broadcastNftUpdated(payload: NftUpdatedEventPayload): number {
  return broadcastMockEvent('nft.updated', payload)
}

export function broadcastOrderUpdated(payload: OrderUpdatedEventPayload): number {
  return broadcastMockEvent('order.updated', payload)
}

export function getActiveMockClientCount(): number {
  return activeClients.size
}

export function clearMockSockets(): void {
  activeClients.clear()
}
