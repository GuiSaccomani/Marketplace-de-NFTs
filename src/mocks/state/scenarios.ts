/**
 * KURIO Mocks: Gerenciador de Cenários Determinísticos de Rede e Falhas.
 *
 * Permite reproduzir cenários previsíveis tanto via cabeçalho HTTP `x-mock-scenario`
 * quanto via API em testes automatizados, sem depender de aleatoriedade.
 */
export type MockScenarioName =
  | 'default'
  | 'empty_nfts'
  | 'transient_error'
  | 'unauthorized'
  | 'session_expired'
  | 'price_changed'
  | 'out_of_stock'
  | 'coupon_invalid'
  | 'coupon_expired'
  | 'payment_rejected'
  | 'network_timeout'

class MockScenarioManager {
  private activeScenario: MockScenarioName = 'default'
  private delayMs = 0

  public setScenario(scenario: MockScenarioName): void {
    this.activeScenario = scenario
  }

  public getScenario(request?: Request): MockScenarioName {
    if (request) {
      const headerScenario = request.headers.get('x-mock-scenario') as MockScenarioName | null
      if (headerScenario && this.isValidScenario(headerScenario)) {
        return headerScenario
      }
    }
    return this.activeScenario
  }

  public setDelay(ms: number): void {
    this.delayMs = ms
  }

  public getDelay(): number {
    return this.delayMs
  }

  public reset(): void {
    this.activeScenario = 'default'
    this.delayMs = 0
  }

  public clearScenario(): void {
    this.reset()
  }

  private isValidScenario(name: string): name is MockScenarioName {
    return [
      'default',
      'empty_nfts',
      'transient_error',
      'unauthorized',
      'session_expired',
      'price_changed',
      'out_of_stock',
      'coupon_invalid',
      'coupon_expired',
      'payment_rejected',
      'network_timeout',
    ].includes(name)
  }
}

export const mockScenarioManager = new MockScenarioManager()
