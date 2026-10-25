import { describe, it, expect } from 'vitest'
import {
  ethToWei,
  weiToEth,
  addEth,
  subEth,
  multiplyEthByQuantity,
  compareEth,
  formatEth,
  isValidEthAmountString,
  InvalidEthAmountError,
  WEI_PER_ETH,
} from '../money'

describe('Domain: money.ts (Precisão Financeira em ETH)', () => {
  describe('isValidEthAmountString', () => {
    it('deve aceitar inteiros válidos', () => {
      expect(isValidEthAmountString('0')).toBe(true)
      expect(isValidEthAmountString('1')).toBe(true)
      expect(isValidEthAmountString('1250')).toBe(true)
    })

    it('deve aceitar decimais válidos com até 18 casas', () => {
      expect(isValidEthAmountString('0.1')).toBe(true)
      expect(isValidEthAmountString('0.000000000000000001')).toBe(true) // 1 Wei
      expect(isValidEthAmountString('1.5')).toBe(true)
      expect(isValidEthAmountString('123.4567890123456789012')).toBe(false) // 19 casas -> falso
    })

    it('deve rejeitar entradas inválidas', () => {
      expect(isValidEthAmountString('')).toBe(false)
      expect(isValidEthAmountString(' ')).toBe(false)
      expect(isValidEthAmountString('abc')).toBe(false)
      expect(isValidEthAmountString('-1')).toBe(false)
      expect(isValidEthAmountString('-0.5')).toBe(false)
      expect(isValidEthAmountString('1.2.3')).toBe(false)
      expect(isValidEthAmountString('1.')).toBe(false)
      expect(isValidEthAmountString('.5')).toBe(false)
      expect(isValidEthAmountString('01.5')).toBe(false)
      expect(isValidEthAmountString('1e-5')).toBe(false)
      expect(isValidEthAmountString(null)).toBe(false)
      expect(isValidEthAmountString(undefined)).toBe(false)
      expect(isValidEthAmountString(123)).toBe(false)
    })
  })

  describe('ethToWei & weiToEth (conversões exatas)', () => {
    it('deve converter 0 ETH para 0n Wei e vice-versa', () => {
      expect(ethToWei('0')).toBe(0n)
      expect(weiToEth(0n)).toBe('0')
    })

    it('deve converter 1 ETH exatamente para 10^18 Wei', () => {
      expect(ethToWei('1')).toBe(WEI_PER_ETH)
      expect(ethToWei('1')).toBe(1000000000000000000n)
      expect(weiToEth(WEI_PER_ETH)).toBe('1')
    })

    it('deve converter 1 Wei (0.000000000000000001 ETH)', () => {
      expect(ethToWei('0.000000000000000001')).toBe(1n)
      expect(weiToEth(1n)).toBe('0.000000000000000001')
    })

    it('deve converter valores fracionários intermediários com remoção de zeros à direita no weiToEth', () => {
      expect(ethToWei('0.5')).toBe(500000000000000000n)
      expect(weiToEth(500000000000000000n)).toBe('0.5')

      expect(ethToWei('2.05')).toBe(2050000000000000000n)
      expect(weiToEth(2050000000000000000n)).toBe('2.05')
    })

    it('deve converter valor com 18 casas decimais completas sem arredondamento', () => {
      const eth18 = '1.123456789012345678'
      const wei = ethToWei(eth18)
      expect(wei).toBe(1123456789012345678n)
      expect(weiToEth(wei)).toBe(eth18)
    })

    it('deve lançar erro descritivo em valores com mais de 18 casas decimais', () => {
      expect(() => ethToWei('0.1234567890123456789')).toThrowError(InvalidEthAmountError)
      expect(() => ethToWei('0.1234567890123456789')).toThrowError(/Excesso de casas decimais/)
    })

    it('deve lançar erro em valores negativos', () => {
      expect(() => ethToWei('-0.5')).toThrowError(InvalidEthAmountError)
      expect(() => ethToWei('-1')).toThrowError(/não podem ser negativos/)
      expect(() => weiToEth(-1n)).toThrowError(InvalidEthAmountError)
    })

    it('deve lançar erro em formatos malformados', () => {
      expect(() => ethToWei('1.')).toThrowError(/sem dígitos fracionários/)
      expect(() => ethToWei('01')).toThrowError(/Zeros à esquerda redundantes/)
      expect(() => ethToWei('1e-5')).toThrowError(/Notação científica/)
      expect(() => ethToWei(' 1.5 ')).toThrowError(/espaços/)
    })
  })

  describe('addEth (Soma exata)', () => {
    it('deve somar 0.1 + 0.2 exatamente como 0.3 (sem erro de float binário IEEE 754)', () => {
      // Em JavaScript normal: 0.1 + 0.2 === 0.30000000000000004
      const result = addEth('0.1', '0.2')
      expect(result).toBe('0.3')
    })

    it('deve somar com valores de alta precisão (18 casas)', () => {
      const a = '0.000000000000000001' // 1 Wei
      const b = '0.000000000000000002' // 2 Wei
      expect(addEth(a, b)).toBe('0.000000000000000003')
    })

    it('deve somar com zero', () => {
      expect(addEth('0', '1.5')).toBe('1.5')
      expect(addEth('2.75', '0')).toBe('2.75')
      expect(addEth('0', '0')).toBe('0')
    })

    it('deve somar valores grandes', () => {
      expect(addEth('999999.999', '0.001')).toBe('1000000')
    })
  })

  describe('subEth (Subtração exata)', () => {
    it('deve subtrair 0.3 - 0.1 retornando 0.2 exato', () => {
      expect(subEth('0.3', '0.1')).toBe('0.2')
    })

    it('deve subtrair até zero', () => {
      expect(subEth('1.5', '1.5')).toBe('0')
    })

    it('deve lançar erro se a subtração resultar em valor negativo', () => {
      expect(() => subEth('0.1', '0.2')).toThrowError(InvalidEthAmountError)
      expect(() => subEth('0.1', '0.2')).toThrowError(/Subtração resultaria em valor negativo/)
    })
  })

  describe('multiplyEthByQuantity (Multiplicação por quantidade inteira)', () => {
    it('deve multiplicar preço unitário por quantidade inteira', () => {
      expect(multiplyEthByQuantity('0.45', 3)).toBe('1.35')
      expect(multiplyEthByQuantity('1.25', 1n)).toBe('1.25')
      expect(multiplyEthByQuantity('2.5', 0)).toBe('0')
    })

    it('deve rejeitar quantidade fracionária ou negativa', () => {
      expect(() => multiplyEthByQuantity('1.0', 1.5)).toThrowError(InvalidEthAmountError)
      expect(() => multiplyEthByQuantity('1.0', -1)).toThrowError(InvalidEthAmountError)
      expect(() => multiplyEthByQuantity('1.0', -2n)).toThrowError(InvalidEthAmountError)
    })
  })

  describe('compareEth (Comparação exata)', () => {
    it('deve retornar 0 para valores equivalentes', () => {
      expect(compareEth('1', '1')).toBe(0)
      expect(compareEth('0.5', '0.50')).toBe(0) // 500k Wei == 500k Wei
      expect(compareEth('0', '0.00')).toBe(0)
    })

    it('deve retornar -1 quando a < b', () => {
      expect(compareEth('0.1', '0.2')).toBe(-1)
      expect(compareEth('0.000000000000000001', '0.000000000000000002')).toBe(-1)
      expect(compareEth('1.999', '2')).toBe(-1)
    })

    it('deve retornar 1 quando a > b', () => {
      expect(compareEth('0.2', '0.1')).toBe(1)
      expect(compareEth('2', '1.999')).toBe(1)
    })
  })

  describe('formatEth (Formatação para apresentação)', () => {
    it('deve formatar valor sem alterar a representação padrão', () => {
      expect(formatEth('1.5')).toBe('1.5')
      expect(formatEth('0')).toBe('0')
    })

    it('deve incluir símbolo ETH quando requisitado', () => {
      expect(formatEth('1.5', { withSymbol: true })).toBe('1.5 ETH')
    })

    it('deve preencher casas decimais mínimas', () => {
      expect(formatEth('1', { minDecimals: 2 })).toBe('1.00')
      expect(formatEth('1.5', { minDecimals: 2 })).toBe('1.50')
      expect(formatEth('1.5', { minDecimals: 4 })).toBe('1.5000')
    })

    it('deve limitar casas decimais máximas para exibição cosmética', () => {
      expect(formatEth('1.123456', { maxDecimals: 2 })).toBe('1.12')
      expect(formatEth('1.123456', { maxDecimals: 4 })).toBe('1.1234')
    })
  })
})
