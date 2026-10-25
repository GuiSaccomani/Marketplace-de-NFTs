/**
 * KURIO Realtime: Rastreamento de versão monotônica incremental por recurso.
 * Garante que eventos fora de ordem não regridam estados mais recentes.
 */
export class VersionTracker {
  private readonly resourceVersions: Map<string, number>

  constructor() {
    this.resourceVersions = new Map()
  }

  /**
   * Avalia se a versão recebida é obsoleta comparada à versão mais recente do recurso.
   * Se incomingVersion > lastSeenVersion: atualiza o registro e retorna false (evento válido).
   * Se incomingVersion <= lastSeenVersion: retorna true (evento obsoleto, deve ser ignorado).
   */
  public isStale(resourceKey: string, incomingVersion: number): boolean {
    if (!resourceKey || typeof incomingVersion !== 'number' || incomingVersion < 1) {
      return true
    }

    const lastSeenVersion = this.resourceVersions.get(resourceKey)

    if (lastSeenVersion !== undefined && incomingVersion <= lastSeenVersion) {
      return true
    }

    this.resourceVersions.set(resourceKey, incomingVersion)
    return false
  }

  /**
   * Recupera a versão atual registrada de um recurso.
   */
  public getVersion(resourceKey: string): number | undefined {
    return this.resourceVersions.get(resourceKey)
  }

  /**
   * Define forçadamente a versão de um recurso (ex: após refresh REST).
   */
  public setVersion(resourceKey: string, version: number): void {
    const current = this.resourceVersions.get(resourceKey) ?? 0
    if (version > current) {
      this.resourceVersions.set(resourceKey, version)
    }
  }

  /**
   * Limpa o mapa de versões (ex: ao deslogar ou trocar de sessão).
   */
  public clear(): void {
    this.resourceVersions.clear()
  }
}
