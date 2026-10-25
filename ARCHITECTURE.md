# Arquitetura do Sistema — KURIO NFT Marketplace

Este documento detalha as decisões técnicas, padrões de engenharia de software e modelos de dados empregados no desenvolvimento do **KURIO NFT Marketplace**.

---

## 1. Precisão Financeira Decimal em ETH (`bigint`)

No ecossistema Ethereum, cálculos financeiros não podem utilizar números de ponto flutuante IEEE 754 de JavaScript devido a erros de arredondamento e perda de precisão infinitesimal.

### Decisão Técnica:
- Todos os valores em ETH trafegam nas APIs REST, contratos e estado de UI como **strings decimais** (ex: `'0.45'`, `'1.855'`).
- Internamente, o módulo `src/domain/money/` converte as strings decimais de ETH para **Wei** (`1 ETH = 10^18 Wei`) utilizando inteiros de precisão arbitrária (`bigint` nativo do JavaScript):
  - `addEth(a, b)`: Soma atômica em Wei.
  - `subEth(a, b)`: Subtração segura com validação contra saldos negativos.
  - `multiplyEthByQuantity(unitEth, quantity)`: Multiplicação com quantidade inteira.
  - `calculateDiscount(subtotalEth, percentage)`: Aplicação exata de porcentagem sem resíduos.
- As operações são 100% livres de dependências externas pesadas e garantem consistência entre o que o usuário vê e o que o contrato de liquidação registra.

---

## 2. Contratos Tipados e Schemas Zod (`src/contracts/`)

A fronteira entre o transporte de rede e a interface é estritamente tipada com **Zod**:
- `NftSchema`, `CollectionDetailSchema`: Garantem que respostas de catálogo e detalhes contenham campos obrigatórios (`editions.availableCount`, `editions.maxPerOrder`, `blockchainNetwork`).
- `CartSchema`, `CartItemSchema`: Validam quantidades e subtotais.
- `QuoteResponseSchema`: Valida a cotação ativa, detalhando subtotal, desconto de cupom, taxas de rede (`gasFeeEth`) e o total final a ser assinado.
- `CreateOrderRequestSchema`, `OrderReceiptSchema`: Asseguram que o recibo contenha `orderId`, `status: 'confirmed' | 'rejected'`, `transactionHash` no formato `0x[a-fA-F0-9]{64}`, e o snapshot imutável dos itens no exato momento da compra.

---

## 3. Estado Assíncrono e Roteamento

### TanStack Router (URL como Fonte Única de Verdade)
- Todos os parâmetros de busca (`search`), coleção (`collectionId`), faixa de preço (`minPriceEth`, `maxPriceEth`), rede (`network`), disponibilidade e ordenação (`sort`) compõem os search params da URL.
- Mudanças de filtro reiniciam automaticamente a paginação para a página 1.
- A navegação direta por ID (`/nfts/$nftId`, `/orders/$orderId`), histórico de voltar/avançar do navegador e compartilhamento de links preservam fielmente o estado da aplicação.

### TanStack Query (Política de Cache e Invalidação)
- `staleTime: 2 minutos` para consultas gerais, evitando requisições redundantes.
- Mutações (adicionar ao carrinho, alterar quantidade, aplicar cupom, checkout) disparam invalidação coordenada das queries afetadas (`cart`, `quote`, `profile`).
- O logout de sessão invoca `queryClient.clear()`, garantindo que dados privados em cache sejam imediatamente expurgados da memória.

---

## 4. Idempotência em Transações de Pagamento

Para impedir pedidos duplicados decorrentes de cliques repetidos ou reenvios após oscilação de rede:
- Toda requisição `POST /api/orders` gera uma chave única no cabeçalho `Idempotency-Key` (formato `idemp-<timestamp>-<hash>`).
- O backend simulado armazena o hash da requisição associado à chave:
  - Se a mesma chave for reenviada com os mesmos parâmetros, o servidor retorna o mesmo pedido existente com código HTTP 200, sem duplicar a cobrança nem decrementar o estoque novamente.
  - Se a chave for reutilizada com parâmetros divergentes, o servidor recusa com código HTTP 409 (Idempotency Conflict).

---

## 5. Tempo Real com Socket.IO e MSW

A sincronização de eventos utiliza o cliente `socket.io-client` integrado ao MSW via `@mswjs/socket.io-binding`:
- **Eventos Homologados:**
  - `nft.updated`: Transmite alterações de preço ou disponibilidade de edições.
  - `order.updated`: Transmite confirmações ou rejeições assíncronas de liquidação.
- **Deduplicação e Ordenação Monotônica:**
  - `EventDeduplicator` (`src/realtime/event-deduplicator.ts`): Armazena um buffer circular (FIFO) com os últimos `eventId`s processados, ignorando duplicatas de rede.
  - `VersionTracker` (`src/realtime/version-tracker.ts`): Mantém a versão mais recente conhecida de cada recurso. Atualizações com versão menor ou igual à já aplicada são descartadas, prevenindo regressões de estado por mensagens fora de ordem.
- **Reconciliação pós-reconexão:** Ao restabelecer a conexão Socket.IO, as queries ativas do TanStack Query são invalidadas para re-sincronizar os dados com a API REST.

---

## 6. Persistência e Snapshot Imutável

- Os mocks mantêm estado consistente entre catálogo, favoritos, carrinho, perfil e pedidos.
- Para sustentar o fluxo exigido pelo desafio (sobrevivência ao refresh e navegação direta por ID), o `MockDatabase` armazena snapshots em `window.localStorage`:
  - Recibos de pedidos já finalizados nunca são alterados mesmo que o catálogo sofra modificações posteriores.
  - O método `mockDb.reset(true)` permite restaurar integralmente o cenário padrão inicial quando desejado.

---

## 7. Otimizações de Build e Bundle Splitting

Configuração de `manualChunks` no `vite.config.ts`:
- `vendor-react`: `react`, `react-dom`, `scheduler` (~176 KB).
- `vendor-tanstack`: `@tanstack/react-router`, `@tanstack/react-query` (~102 KB).
- `vendor-utils`: `zod`, `axios` (~106 KB).
- `vendor-realtime`: `socket.io-client`, `engine.io-client` (~44 KB).
- Chunks de rotas compilados sob demanda.
- Nenhum chunk do projeto ultrapassa 208 KB após minificação.
