import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface CatalogErrorProps {
  message?: string
  onRetry: () => void
}

export const CatalogError: React.FC<CatalogErrorProps> = ({
  message = 'Ocorreu uma falha temporária ao carregar os NFTs.',
  onRetry,
}) => {
  return (
    <div
      data-testid="catalog-error-state"
      className="flex flex-col items-center justify-center p-10 text-center border border-red-900/60 rounded bg-red-950/20 my-8"
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-950/60 text-red-400 mb-3 border border-red-800">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <h3 className="text-base font-bold text-red-200 mb-1 font-mono">
        Falha na Conexão
      </h3>

      <p className="text-xs text-kurio-text-secondary max-w-sm mb-5">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-semibold uppercase tracking-wider bg-kurio-surface-card border border-kurio-border text-kurio-foreground hover:border-kurio-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kurio-primary"
      >
        <RefreshCw className="w-3.5 h-3.5 text-kurio-primary" />
        <span>Tentar Novamente</span>
      </button>
    </div>
  )
}
