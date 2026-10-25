import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ordersService } from '@/services'
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Printer,
  ShieldCheck,
  Layers,
  Calendar,
  Wallet,
  RefreshCw,
} from 'lucide-react'

export const Route = createFileRoute('/orders/$orderId')({
  component: OrderReceiptPage,
})

function OrderReceiptPage() {
  const { orderId } = Route.useParams()
  const router = useRouter()
  const [copiedTx, setCopiedTx] = useState(false)

  // Consulta do snapshot imutável do pedido/recibo
  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersService.getOrderReceipt(orderId),
  })

  const handleCopyTxHash = () => {
    if (order?.transactionHash) {
      void navigator.clipboard.writeText(order.transactionHash)
      setCopiedTx(true)
      setTimeout(() => setCopiedTx(false), 3000)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // --- Caso 1: Loading Skeleton ---
  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-8">
        <div className="h-28 rounded-2xl bg-kurio-surface-card border border-kurio-border" />
        <div className="h-96 rounded-2xl bg-kurio-surface-card border border-kurio-border" />
      </main>
    )
  }

  // --- Caso 2: Pedido Não Encontrado ou Erro ---
  if (isError || !order) {
    const isNotFound = (error as { status?: number })?.status === 404
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-950/40 border border-red-800 flex items-center justify-center text-red-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold font-mono text-kurio-foreground">
            {isNotFound ? 'Pedido Não Encontrado' : 'Erro ao Carregar Recibo'}
          </h1>
          <p className="text-xs sm:text-sm text-kurio-text-secondary">
            {isNotFound
              ? `O pedido "${orderId}" não existe ou pertence a outra sessão.`
              : 'Ocorreu uma falha temporária ao sincronizar o recibo com o servidor.'}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-bold uppercase bg-kurio-surface border border-kurio-border text-kurio-foreground hover:border-kurio-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          {!isNotFound && (
            <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-bold uppercase bg-kurio-primary text-kurio-ink hover:bg-kurio-accent transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tentar Novamente</span>
            </button>
          )}
        </div>
      </main>
    )
  }

  const isConfirmed = order.status === 'confirmed'
  const formattedDate = new Date(order.confirmedAt || order.createdAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8 print:py-0 print:px-0">
      {/* Barra de Ações Superior (Oculta na Impressão) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-kurio-text-secondary hover:text-kurio-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explorar Mais Obras</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded text-xs font-mono font-bold uppercase bg-kurio-surface border border-kurio-border text-kurio-foreground hover:border-kurio-primary transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Recibo</span>
          </button>
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded text-xs font-mono font-bold uppercase bg-kurio-primary text-kurio-ink hover:bg-kurio-accent transition-colors"
          >
            <span>Ver no Perfil</span>
          </Link>
        </div>
      </div>

      {/* Cartão de Status do Pedido */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border text-center space-y-3 shadow-2xl ${
          isConfirmed
            ? 'border-emerald-800 bg-emerald-950/20'
            : 'border-red-800 bg-red-950/20'
        }`}
      >
        <div
          className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
            isConfirmed
              ? 'bg-emerald-900/40 border border-emerald-600 text-emerald-400'
              : 'bg-red-900/40 border border-red-600 text-red-400'
          }`}
        >
          {isConfirmed ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : (
            <AlertTriangle className="w-8 h-8" />
          )}
        </div>

        <h1 className="text-xl sm:text-2xl font-bold font-mono text-kurio-foreground">
          {isConfirmed ? 'Pagamento e Transferência Confirmados' : 'Transação Rejeitada'}
        </h1>

        <p className="text-xs sm:text-sm text-kurio-text-secondary max-w-lg mx-auto font-sans leading-relaxed">
          {isConfirmed
            ? 'Sua compra foi validada e registrada com sucesso. O snapshot abaixo é imutável e comprova a liquidação dos tokens.'
            : order.rejectionReason || 'A transação foi recusada pela rede simulada.'}
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-mono">
          <span className="px-3 py-1 rounded bg-kurio-ink border border-kurio-border text-kurio-text-secondary">
            ID: <strong className="text-kurio-foreground">{order.orderId}</strong>
          </span>
          <span className="px-3 py-1 rounded bg-kurio-ink border border-kurio-border text-kurio-accent">
            Rede: <strong>{order.network}</strong>
          </span>
        </div>
      </div>

      {/* Bloco Principal do Recibo Oficial KURIO */}
      <div className="p-6 sm:p-10 rounded-2xl border border-kurio-border bg-kurio-surface-card space-y-8 shadow-2xl print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Cabeçalho do Recibo */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-kurio-border/80">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-kurio-primary font-bold block mb-1">
              Recibo Oficial de Liquidação
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-kurio-foreground">
              KURIO NFT Marketplace
            </div>
          </div>

          <div className="text-left sm:text-right text-xs font-mono text-kurio-text-secondary space-y-1">
            <div className="flex items-center gap-1.5 sm:justify-end">
              <Calendar className="w-3.5 h-3.5 text-kurio-accent" />
              <span>{formattedDate}</span>
            </div>
            <div>Versão do Snapshot: v{order.version}</div>
          </div>
        </div>

        {/* Metadados da Transação Blockchain */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-kurio-border/80 bg-kurio-ink/60 text-xs font-mono">
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-kurio-text-secondary block">
              Comprador / Titular
            </span>
            <div className="font-bold text-kurio-foreground">{order.buyer.name}</div>
            <div className="text-kurio-text-secondary text-[11px]">{order.buyer.email}</div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase text-kurio-text-secondary block">
              Carteira Pagadora
            </span>
            <div className="font-bold text-kurio-foreground flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-kurio-accent" />
              <span>{order.walletAddress}</span>
            </div>
          </div>

          {order.transactionHash && (
            <div className="sm:col-span-2 pt-2 border-t border-kurio-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase text-kurio-text-secondary block">
                  Hash da Transação na Blockchain
                </span>
                <span className="text-[11px] text-kurio-accent break-all font-mono">
                  {order.transactionHash}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyTxHash}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-kurio-surface border border-kurio-border text-kurio-text-secondary hover:text-kurio-foreground text-[10px] uppercase font-bold shrink-0 self-start sm:self-center"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedTx ? 'Copiado!' : 'Copiar Hash'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Lista de Itens do Pedido (Snapshot Imutável) */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-kurio-text-secondary flex items-center gap-2">
            <Layers className="w-4 h-4 text-kurio-primary" />
            <span>Itens Adquiridos ({order.items.length})</span>
          </h2>

          <div className="divide-y divide-kurio-border/60 border-y border-kurio-border/60">
            {order.items.map((item) => (
              <div
                key={item.nftId}
                className="py-4 flex items-center justify-between gap-4 text-xs font-mono"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    className="w-14 h-14 rounded-lg object-cover bg-kurio-ink shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] text-kurio-text-secondary uppercase truncate block">
                      {item.collectionName}
                    </span>
                    <span className="font-bold text-sm text-kurio-foreground truncate block">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-kurio-text-secondary">
                      {item.quantity}x @ {item.unitPriceEth} ETH
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-kurio-primary text-sm">
                    {item.subtotalEth} ETH
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo Financeiro com Precisão Exata */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pt-4">
          <div className="space-y-2 max-w-sm text-xs font-mono text-kurio-text-secondary">
            <div className="flex items-center gap-1.5 text-kurio-accent">
              <ShieldCheck className="w-4 h-4" />
              <span>Snapshot Criptográfico Válido</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Alterações futuras de preço ou estoque no catálogo não afetam os valores imutáveis deste
              recibo.
            </p>
          </div>

          <div className="w-full sm:w-72 space-y-2.5 text-xs font-mono">
            <div className="flex justify-between text-kurio-text-secondary">
              <span>Subtotal dos Itens</span>
              <span className="text-kurio-foreground font-semibold">{order.subtotalEth} ETH</span>
            </div>

            {order.discountEth && order.discountEth !== '0' && (
              <div className="flex justify-between text-kurio-accent">
                <span>Desconto Aplicado</span>
                <span className="font-bold">-{order.discountEth} ETH</span>
              </div>
            )}

            <div className="flex justify-between text-kurio-text-secondary">
              <span>Taxa de Rede</span>
              <span className="text-kurio-foreground font-semibold">{order.networkFeeEth} ETH</span>
            </div>

            {/* Total Pago */}
            <div className="pt-3 border-t border-kurio-border flex items-baseline justify-between">
              <span className="text-sm font-bold uppercase text-kurio-foreground">Total Pago</span>
              <span className="text-2xl font-extrabold font-mono text-kurio-primary">
                {order.totalEth} <span className="text-xs text-kurio-foreground font-normal">ETH</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
