import React from 'react'
import type { NftSortOption } from '@/contracts'
import { ArrowUpDown } from 'lucide-react'

interface SortSelectProps {
  value: NftSortOption
  onChange: (newSort: NftSortOption) => void
}

const SORT_OPTIONS: { id: NftSortOption; label: string }[] = [
  { id: 'recently_listed', label: 'Mais Recentes' },
  { id: 'price_asc', label: 'Menor Preço (ETH)' },
  { id: 'price_desc', label: 'Maior Preço (ETH)' },
  { id: 'popular', label: 'Mais Populares' },
]

export const SortSelect: React.FC<SortSelectProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:flex items-center gap-1 text-xs text-kurio-text-secondary font-mono">
        <ArrowUpDown className="w-3.5 h-3.5 text-kurio-primary" />
        <span>Ordenar por:</span>
      </span>

      <select
        data-testid="sort-select"
        value={value}
        onChange={(e) => onChange(e.target.value as NftSortOption)}
        className="px-3 py-2 text-xs font-mono rounded bg-kurio-surface-card border border-kurio-border text-kurio-foreground focus:border-kurio-primary focus:outline-none cursor-pointer"
        aria-label="Critério de ordenação de NFTs"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
