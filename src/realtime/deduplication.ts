/**
 * KURIO Realtime: Deduplicação de eventos via UUID estável (eventId).
 * Em conformidade com o CHALLENGE.md (Seção 7).
 */
export class EventDeduplicator {
  private readonly maxEntries: number
  private readonly seenIds: Set<string>
  private readonly queue: string[]

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries
    this.seenIds = new Set()
    this.queue = []
  }

  /**
   * Verifica se o eventId já foi processado anteriormente.
   * Se for novo, registra e retorna false.
   * Se for repetido, retorna true.
   */
  public isDuplicate(eventId: string): boolean {
    if (!eventId) return true

    if (this.seenIds.has(eventId)) {
      return true
    }

    this.seenIds.add(eventId)
    this.queue.push(eventId)

    // Despejo rotativo FIFO para manter tamanho limitado
    if (this.queue.length > this.maxEntries) {
      const oldest = this.queue.shift()
      if (oldest) {
        this.seenIds.delete(oldest)
      }
    }

    return false
  }

  /**
   * Limpa todo o histórico de IDs vistos (ex: ao deslogar ou trocar de sessão).
   */
  public clear(): void {
    this.seenIds.clear()
    this.queue.length = 0
  }

  /**
   * Retorna a quantidade atual de eventos no histórico.
   */
  public size(): number {
    return this.seenIds.size
  }
}
