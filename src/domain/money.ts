/**
 * KURIO Domain: Precisão Financeira em ETH.
 *
 * Em conformidade com o CHALLENGE.md (Seção 3):
 * "Valores em ETH devem trafegar como strings decimais e manter precisão nos cálculos e na apresentação."
 *
 * Regras estritas:
 * 1. Não utiliza Number, parseFloat ou multiplicação por 10 ** 18.
 * 2. Conversões e cálculos são executados com bigint na menor unidade (Wei: 1 ETH = 10^18 Wei).
 * 3. Valores são estritamente não-negativos para preços, saldos, taxas e totais.
 * 4. Strings com mais de 18 casas decimais são rejeitadas por causarem perda de precisão (sub-Wei).
 */

export const ETH_DECIMALS = 18
export const WEI_PER_ETH = 1_000_000_000_000_000_000n

export class InvalidEthAmountError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidEthAmountError'
  }
}

/**
 * Regex estrita para formato decimal não-negativo de ETH:
 * - Parte inteira: 0 ou sequência iniciada por 1-9 (rejeita zeros redundantes como "01").
 * - Parte decimal opcional: ponto seguido de 1 a 18 dígitos numéricos.
 * - Rejeita expoentes (e, E), sinais (+, -), espaços e caracteres não numéricos.
 */
const ETH_STRING_REGEX = /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/

/**
 * Verifica se a string representa um valor monetário em ETH sintaticamente válido.
 */
export function isValidEthAmountString(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (trimmed === '' || trimmed !== value) return false
  return ETH_STRING_REGEX.test(value)
}

/**
 * Valida a string de ETH e lança erros descritivos caso o valor não seja aceito.
 */
export function assertValidEthAmountString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new InvalidEthAmountError('Valor em ETH deve ser uma string.')
  }
  if (value.trim() === '') {
    throw new InvalidEthAmountError('Valor em ETH não pode ser vazio.')
  }
  if (value !== value.trim()) {
    throw new InvalidEthAmountError('Valor em ETH não deve conter espaços no início ou fim.')
  }
  if (value.startsWith('-')) {
    throw new InvalidEthAmountError(`Valores em ETH não podem ser negativos: "${value}".`)
  }
  if (value.includes('e') || value.includes('E')) {
    throw new InvalidEthAmountError(
      `Notação científica não é permitida para valores monetários: "${value}".`,
    )
  }

  const parts = value.split('.')
  if (parts.length > 2) {
    throw new InvalidEthAmountError(`Formato decimal inválido (múltiplos pontos): "${value}".`)
  }

  const intPart = parts[0] ?? ''
  const fracPart = parts[1]

  if (!/^\d+$/.test(intPart)) {
    throw new InvalidEthAmountError(`Parte inteira inválida: "${intPart}".`)
  }
  if (intPart.length > 1 && intPart.startsWith('0')) {
    throw new InvalidEthAmountError(
      `Zeros à esquerda redundantes na parte inteira não são permitidos: "${value}".`,
    )
  }

  if (fracPart !== undefined) {
    if (fracPart.length === 0) {
      throw new InvalidEthAmountError(`Ponto decimal sem dígitos fracionários: "${value}".`)
    }
    if (!/^\d+$/.test(fracPart)) {
      throw new InvalidEthAmountError(`Parte fracionária inválida: "${fracPart}".`)
    }
    if (fracPart.length > ETH_DECIMALS) {
      throw new InvalidEthAmountError(
        `Excesso de casas decimais: "${value}" possui ${fracPart.length} casas (máximo permitido: ${ETH_DECIMALS}).`,
      )
    }
  }

  if (!ETH_STRING_REGEX.test(value)) {
    throw new InvalidEthAmountError(`Formato inválido para valor em ETH: "${value}".`)
  }
}

/**
 * Converte uma string decimal de ETH para a menor unidade (Wei) como bigint.
 * Não utiliza ponto flutuante nem parseFloat.
 */
export function ethToWei(eth: string): bigint {
  assertValidEthAmountString(eth)

  const parts = eth.split('.')
  const intPart = parts[0] ?? '0'
  const fracPart = parts[1] ?? ''
  const paddedFrac = fracPart.padEnd(ETH_DECIMALS, '0')

  const intWei = BigInt(intPart) * WEI_PER_ETH
  const fracWei = BigInt(paddedFrac)

  return intWei + fracWei
}

/**
 * Converte um valor em Wei (bigint) para uma string decimal exata de ETH.
 * Garante que não haja notação científica nem perda de precisão.
 */
export function weiToEth(wei: bigint): string {
  if (wei < 0n) {
    throw new InvalidEthAmountError(`Valor em Wei não pode ser negativo: "${wei.toString()}".`)
  }

  if (wei === 0n) return '0'

  const intPart = (wei / WEI_PER_ETH).toString()
  const remainder = wei % WEI_PER_ETH

  if (remainder === 0n) {
    return intPart
  }

  const fracString = remainder.toString().padStart(ETH_DECIMALS, '0')
  const trimmedFrac = fracString.replace(/0+$/, '')

  return `${intPart}.${trimmedFrac}`
}

/**
 * Soma dois valores em ETH com precisão exata.
 */
export function addEth(a: string, b: string): string {
  const weiA = ethToWei(a)
  const weiB = ethToWei(b)
  return weiToEth(weiA + weiB)
}

/**
 * Subtrai b de a com precisão exata.
 * Lança erro caso o resultado seja negativo.
 */
export function subEth(a: string, b: string): string {
  const weiA = ethToWei(a)
  const weiB = ethToWei(b)
  if (weiA < weiB) {
    throw new InvalidEthAmountError(
      `Subtração resultaria em valor negativo: "${a}" - "${b}" (${weiA} Wei < ${weiB} Wei).`,
    )
  }
  return weiToEth(weiA - weiB)
}

/**
 * Multiplica o preço unitário em ETH por uma quantidade inteira (>= 0).
 */
export function multiplyEthByQuantity(unitPriceEth: string, quantity: number | bigint): string {
  if (typeof quantity === 'number') {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new InvalidEthAmountError(
        `Quantidade deve ser um número inteiro não-negativo: ${quantity}.`,
      )
    }
    quantity = BigInt(quantity)
  } else if (quantity < 0n) {
    throw new InvalidEthAmountError(`Quantidade não pode ser negativa: ${quantity.toString()}.`)
  }

  const unitWei = ethToWei(unitPriceEth)
  return weiToEth(unitWei * quantity)
}

/**
 * Compara dois valores monetários em ETH.
 * Retorna -1 se a < b, 0 se a === b, 1 se a > b.
 */
export function compareEth(a: string, b: string): -1 | 0 | 1 {
  const weiA = ethToWei(a)
  const weiB = ethToWei(b)
  if (weiA < weiB) return -1
  if (weiA > weiB) return 1
  return 0
}

export interface FormatEthOptions {
  /** Número mínimo de casas decimais a exibir (preenchidas com 0). */
  minDecimals?: number
  /** Número máximo de casas decimais a exibir. */
  maxDecimals?: number
  /** Incluir sufixo ' ETH'. Padrão: false. */
  withSymbol?: boolean
}

/**
 * Formata um valor em ETH para exibição amigável na interface, sem perder precisão.
 */
export function formatEth(eth: string, options: FormatEthOptions = {}): string {
  assertValidEthAmountString(eth)

  const { minDecimals, maxDecimals, withSymbol = false } = options

  const parts = eth.split('.')
  const intPart = parts[0] ?? '0'
  const fracPart = parts[1] ?? ''
  let formattedFrac = fracPart

  if (maxDecimals !== undefined && formattedFrac.length > maxDecimals) {
    formattedFrac = formattedFrac.slice(0, maxDecimals)
  }

  if (minDecimals !== undefined && formattedFrac.length < minDecimals) {
    formattedFrac = formattedFrac.padEnd(minDecimals, '0')
  }

  const result = formattedFrac.length > 0 ? `${intPart}.${formattedFrac}` : intPart
  return withSymbol ? `${result} ETH` : result
}
