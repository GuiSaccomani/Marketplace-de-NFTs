/**
 * KURIO Realtime: Gerenciador Central da Conexão Socket.IO e Integração com TanStack Query.
 */
import type { QueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import {
  NftUpdatedEventPayloadSchema,
  OrderUpdatedEventPayloadSchema,
  type Nft,
  type OrderReceipt,
  type Cart,
} from '@/contracts'
import { EventDeduplicator } from './deduplication'
import { VersionTracker } from './version-tracker'
import type { RealtimeConnectionStatus, RealtimeState } from './types'

export const REALTIME_SOCKET_URL = 'wss://realtime.kurio.test'

export class KurioRealtimeClient {
  private socket: Socket | null = null
  private queryClient: QueryClient | null = null
  private readonly deduplicator = new EventDeduplicator(1000)
  private readonly versionTracker = new VersionTracker()
  private state: RealtimeState = {
    status: 'disconnected',
    lastEvent: null,
    lastConnectedAt: null,
  }
  private readonly listeners = new Set<(state: RealtimeState) => void>()
  private hadConnectedOnce = false
  private isConnecting = false

  /**
   * Conecta o cliente Socket.IO ao endpoint seguro de tempo real.
   */
  public async connect(queryClient: QueryClient, url = REALTIME_SOCKET_URL): Promise<void> {
    this.queryClient = queryClient

    if (this.socket?.connected || this.isConnecting) {
      return
    }

    this.isConnecting = true
    this.updateStatus('connecting')

    try {
      const { io } = await import('socket.io-client')
      const socket = io(url, {
        transports: ['websocket'],
        reconnection: false,
        timeout: 3000,
      })

      this.socket = socket

      socket.on('connect', () => {
        this.isConnecting = false
        this.updateStatus('connected')

        // Se reconectar após uma desconexão anterior, sincroniza dados ativos
        if (this.hadConnectedOnce) {
          this.syncActiveQueriesOnReconnect()
        }
        this.hadConnectedOnce = true
      })

      socket.on('disconnect', (reason) => {
        this.isConnecting = false
        this.updateStatus('disconnected')
        if (reason === 'io server disconnect') {
          // Reconectar manualmente se desconectado pelo servidor
          socket.connect()
        }
      })

      socket.on('reconnect_attempt', () => {
        this.updateStatus('reconnecting')
      })

      socket.on('connect_error', () => {
        this.isConnecting = false
        this.updateStatus('disconnected')
      })

      // Listener de Eventos de NFT (Preço, Estoque, Disponibilidade)
      socket.on('nft.updated', (rawPayload: unknown) => {
        this.handleNftUpdated(rawPayload)
      })

      // Listener de Eventos de Pedido (Status de Liquidação)
      socket.on('order.updated', (rawPayload: unknown) => {
        this.handleOrderUpdated(rawPayload)
      })
    } catch {
      this.isConnecting = false
      this.updateStatus('disconnected')
    }
  }

  /**
   * Processa o evento nft.updated com validação, deduplicação e controle de versão monotônica.
   */
  public handleNftUpdated(rawPayload: unknown): boolean {
    const parseResult = NftUpdatedEventPayloadSchema.safeParse(rawPayload)
    if (!parseResult.success) {
      return false
    }

    const payload = parseResult.data

    // 1. Deduplicação via eventId
    if (this.deduplicator.isDuplicate(payload.eventId)) {
      return false
    }

    // 2. Descarte de versão obsoleta/fora de ordem
    const resourceKey = `nft:${payload.nftId}`
    if (this.versionTracker.isStale(resourceKey, payload.version)) {
      return false
    }

    // 3. Atualização no TanStack Query
    if (this.queryClient) {
      // Atualiza o detalhe do NFT na query individual ['nft', nftId]
      this.queryClient.setQueryData<Nft>(['nft', payload.nftId], (old) => {
        if (!old) return old
        return {
          ...old,
          priceEth: payload.priceEth,
          editions: {
            ...old.editions,
            availableCount: payload.availableQuantity,
          },
          version: payload.version,
        }
      })

      // Invalida a listagem do catálogo para que os cards mostrem o novo preço/estoque
      void this.queryClient.invalidateQueries({ queryKey: ['nfts'] })

      // Se o NFT modificado estiver no carrinho do usuário, invalida carrinho e cotação
      const currentCart = this.queryClient.getQueryData<Cart>(['cart'])
      if (currentCart?.items.some((i) => i.nftId === payload.nftId)) {
        void this.queryClient.invalidateQueries({ queryKey: ['cart'] })
        void this.queryClient.invalidateQueries({ queryKey: ['quote'] })
      }
    }

    this.notifyEvent({ type: 'nft.updated', payload })
    return true
  }

  /**
   * Processa o evento order.updated preservando o snapshot imutável do recibo.
   */
  public handleOrderUpdated(rawPayload: unknown): boolean {
    const parseResult = OrderUpdatedEventPayloadSchema.safeParse(rawPayload)
    if (!parseResult.success) {
      return false
    }

    const payload = parseResult.data

    // 1. Deduplicação via eventId
    if (this.deduplicator.isDuplicate(payload.eventId)) {
      return false
    }

    // 2. Descarte de versão obsoleta
    const resourceKey = `order:${payload.orderId}`
    if (this.versionTracker.isStale(resourceKey, payload.version)) {
      return false
    }

    // 3. Atualização cirúrgica no TanStack Query (mantendo itens e valores intactos)
    if (this.queryClient) {
      this.queryClient.setQueryData<OrderReceipt>(['order', payload.orderId], (old) => {
        if (!old) return old
        return {
          ...old,
          status: payload.status,
          transactionHash: payload.transactionHash || old.transactionHash,
          rejectionReason: payload.rejectionReason || old.rejectionReason,
          version: payload.version,
        }
      })

      // Invalida lista de pedidos do perfil
      void this.queryClient.invalidateQueries({ queryKey: ['orders'] })
    }

    this.notifyEvent({ type: 'order.updated', payload })
    return true
  }

  /**
   * Sincroniza consultas ativas após reconexão da rede.
   */
  private syncActiveQueriesOnReconnect(): void {
    if (!this.queryClient) return
    void this.queryClient.invalidateQueries({ queryKey: ['nfts'] })
    void this.queryClient.invalidateQueries({ queryKey: ['cart'] })
    void this.queryClient.invalidateQueries({ queryKey: ['quote'] })
    void this.queryClient.invalidateQueries({ queryKey: ['orders'] })
  }

  /**
   * Limpa todo o estado e histórico de versões na troca ou encerramento de sessão.
   */
  public resetSession(): void {
    this.deduplicator.clear()
    this.versionTracker.clear()
    this.state.lastEvent = null
    this.notifyListeners()
  }

  /**
   * Desconecta o socket e encerra a conexão.
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.updateStatus('disconnected')
  }

  public getState(): RealtimeState {
    return this.state
  }

  public subscribe(listener: (state: RealtimeState) => void): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private updateStatus(status: RealtimeConnectionStatus): void {
    this.state = {
      ...this.state,
      status,
      lastConnectedAt:
        status === 'connected' ? new Date().toISOString() : this.state.lastConnectedAt,
    }
    this.notifyListeners()
  }

  private notifyEvent(event: RealtimeState['lastEvent']): void {
    this.state = {
      ...this.state,
      lastEvent: event,
    }
    this.notifyListeners()
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state)
    }
  }

  // Apenas para testes unitários: acesso aos rastreadores
  public getDeduplicator(): EventDeduplicator {
    return this.deduplicator
  }

  public getVersionTracker(): VersionTracker {
    return this.versionTracker
  }
}

export const realtimeClient = new KurioRealtimeClient()
