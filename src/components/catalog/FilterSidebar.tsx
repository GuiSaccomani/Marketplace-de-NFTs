import React, { useState } from 'react'
import type { CollectionDetail, NftAvailabilityFilter } from '@/contracts'
import { Filter, X, RotateCcw } from 'lucide-react'

export interface FilterState {
  collectionId?: string
  network?: string
  availability?: NftAvailabilityFilter
  minPriceEth?: string
  maxPriceEth?: string
}

interface FilterSidebarProps {
  filters: FilterState
  collections: CollectionDetail[]
  onFilterChange: (newFilters: Partial<FilterState>) => void
  onResetFilters: () => void
  isMobileModal?: boolean
  onCloseMobileModal?: () => void
}

const NETWORKS = [
  { id: '', label: 'Todas as Redes' },
  { id: 'Ethereum Mainnet', label: 'Ethereum' },
  { id: 'Polygon', label: 'Polygon' },
  { id: 'Sepolia', label: 'Sepolia (Testnet)' },
]

const AVAILABILITY_OPTIONS: { id: NftAvailabilityFilter; label: string }[] = [
  { id: 'all', label: 'Todos os Itens' },
  { id: 'available', label: 'Apenas Disponíveis' },
  { id: 'sold_out', label: 'Esgotados' },
]

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  collections,
  onFilterChange,
  onResetFilters,
  isMobileModal = false,
  onCloseMobileModal,
}) => {
  const [minPriceInput, setMinPriceInput] = useState(filters.minPriceEth || '')
  const [maxPriceInput, setMaxPriceInput] = useState(filters.maxPriceEth || '')

  const hasActiveFilters = Boolean(
    filters.collectionId ||
      filters.network ||
      (filters.availability && filters.availability !== 'all') ||
      filters.minPriceEth ||
      filters.maxPriceEth,
  )

  const handleApplyPrice = (e: React.FormEvent) => {
    e.preventDefault()
    onFilterChange({
      minPriceEth: minPriceInput.trim() || undefined,
      maxPriceEth: maxPriceInput.trim() || undefined,
    })
  }

  const handleReset = () => {
    setMinPriceInput('')
    setMaxPriceInput('')
    onResetFilters()
  }

  return (
    <aside
      className={`flex flex-col gap-6 ${
        isMobileModal
          ? 'w-full p-4'
          : 'w-full lg:w-64 shrink-0 rounded border border-kurio-border bg-kurio-surface-card p-5 h-fit'
      }`}
    >
      {/* Cabeçalho de Filtros */}
      <div className="flex items-center justify-between pb-3 border-b border-kurio-border">
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-kurio-foreground">
          <Filter className="w-4 h-4 text-kurio-primary" />
          <span>Filtros</span>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-[11px] font-mono text-kurio-accent hover:text-kurio-foreground transition-colors"
              title="Redefinir filtros"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar</span>
            </button>
          )}

          {isMobileModal && onCloseMobileModal && (
            <button
              type="button"
              onClick={onCloseMobileModal}
              className="p-1 rounded text-kurio-text-secondary hover:text-kurio-foreground"
              aria-label="Fechar filtros"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Faixa de Preço em ETH */}
      <div className="space-y-2.5">
        <label className="text-[11px] font-mono uppercase tracking-wider text-kurio-text-secondary">
          Preço (ETH)
        </label>
        <form onSubmit={handleApplyPrice} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Mín"
              aria-label="Preço mínimo em ETH"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-kurio-ink border border-kurio-border text-kurio-foreground placeholder:text-kurio-text-secondary/60 focus:border-kurio-primary focus:outline-none"
            />
            <input
              type="text"
              placeholder="Máx"
              aria-label="Preço máximo em ETH"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-kurio-ink border border-kurio-border text-kurio-foreground placeholder:text-kurio-text-secondary/60 focus:border-kurio-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1.5 rounded text-xs font-mono uppercase tracking-wider font-semibold bg-kurio-ink border border-kurio-border text-kurio-foreground hover:border-kurio-primary transition-colors"
          >
            Aplicar Faixa
          </button>
        </form>
      </div>

      {/* 2. Coleção */}
      <div className="space-y-2.5">
        <label
          htmlFor="filter-collection-select"
          className="text-[11px] font-mono uppercase tracking-wider text-kurio-text-secondary"
        >
          Coleção
        </label>
        <select
          id="filter-collection-select"
          aria-label="Filtrar por Coleção"
          value={filters.collectionId || ''}
          onChange={(e) => onFilterChange({ collectionId: e.target.value || undefined })}
          className="w-full px-2.5 py-2 text-xs font-mono rounded bg-kurio-ink border border-kurio-border text-kurio-foreground focus:border-kurio-primary focus:outline-none cursor-pointer"
        >
          <option value="">Todas as Coleções</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Rede Blockchain */}
      <div className="space-y-2.5">
        <label className="text-[11px] font-mono uppercase tracking-wider text-kurio-text-secondary">
          Rede Blockchain
        </label>
        <div className="space-y-1">
          {NETWORKS.map((net) => {
            const isSelected = (filters.network || '') === net.id
            return (
              <button
                key={net.id}
                type="button"
                onClick={() => onFilterChange({ network: net.id || undefined })}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono transition-colors flex items-center justify-between ${
                  isSelected
                    ? 'bg-kurio-primary/10 border border-kurio-primary text-kurio-primary font-semibold'
                    : 'text-kurio-text-secondary hover:text-kurio-foreground hover:bg-kurio-ink/60'
                }`}
              >
                <span>{net.label}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-kurio-primary" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. Disponibilidade */}
      <div className="space-y-2.5">
        <label className="text-[11px] font-mono uppercase tracking-wider text-kurio-text-secondary">
          Disponibilidade
        </label>
        <div className="space-y-1">
          {AVAILABILITY_OPTIONS.map((opt) => {
            const isSelected = (filters.availability || 'all') === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onFilterChange({ availability: opt.id })}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono transition-colors flex items-center justify-between ${
                  isSelected
                    ? 'bg-kurio-primary/10 border border-kurio-primary text-kurio-primary font-semibold'
                    : 'text-kurio-text-secondary hover:text-kurio-foreground hover:bg-kurio-ink/60'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-kurio-primary" />}
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
