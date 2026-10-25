import React from 'react'
import kurioLogo from '@/assets/brand/kurio-logo.svg'

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-kurio-border bg-kurio-ink text-kurio-foreground mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <img
              src={kurioLogo}
              alt="KURIO Logo"
              width={120}
              height={28}
              className="h-7 sm:h-8 w-auto object-contain opacity-95 shrink-0"
            />
            <p className="text-xs text-kurio-text-secondary max-w-sm text-center md:text-left">
              Marketplace descentralizado de arte digital e colecionáveis raros em Ethereum, Polygon e Sepolia.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-kurio-text-secondary font-mono">
            <span>© {new Date().getFullYear()} KURIO Art. Todos os direitos reservados.</span>
            <span className="hidden sm:inline text-kurio-border">•</span>
            <span className="text-kurio-primary">Ambiente Simulado MSW</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
