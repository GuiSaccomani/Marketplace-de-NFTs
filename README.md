# KURIO — NFT Marketplace

> **Desafio Frontend — Marketplace de NFTs.**
> Plataforma descentralizada de arte digital e colecionáveis raros, construída com fidelidade visual ao Figma, precisão financeira exata em ETH, simulação de rede e eventos em tempo real com MSW e Socket.IO, e cobertura de testes automatizados com Playwright e Vitest.

---

## 📌 Sumário
1. [Visão Geral e Escopo](#-visão-geral-e-escopo)
2. [Stack Tecnológica Obrigatória](#-stack-tecnológica-obrigatória)
3. [Instalação e Execução](#-instalação-e-execução)
4. [Variáveis de Ambiente](#-variáveis-de-ambiente)
5. [Credenciais Fictícias de Demonstração](#-credenciais-fictícias-de-demonstração)
6. [Cenários de Simulação e Rede (MSW)](#-cenários-de-simulação-e-rede-msw)
7. [Scripts Disponíveis](#-scripts-disponíveis)
8. [Auditoria Lighthouse & Performance](#-auditoria-lighthouse--performance)
9. [Aviso sobre Dados Simulados](#-aviso-sobre-dados-simulados)

---

## 🌐 Visão Geral e Escopo

O **KURIO NFT Marketplace** entrega uma experiência de usuário fluida e responsiva (Desktop 1440px, Tablet 768px e Mobile 390px), contemplando:
- **Catálogo de NFTs:** Destaque Hero, busca textual em tempo real, filtros combináveis (preço, rede, coleção, disponibilidade), ordenação e paginação persistidos na URL (`TanStack Router`).
- **Detalhes do NFT:** Visualização de metadados, barra de progresso de edições vendidas, seletor de quantidades respeitando limites de estoque, toggle de favoritos persistente e adição ao carrinho.
- **Carrinho de Compras:** Edição de quantidades, remoção, cálculo em tempo real de taxas por rede e aplicação de cupons de desconto (`KURIO10`, `KURIO20`, `EXPIRED50`).
- **Checkout Idempotente:** Seleção de carteiras conectadas (MetaMask, Coinbase), revisão de cotação revalidada em tempo real e proteção estrita contra pedidos duplicados via chave de idempotência (`Idempotency-Key`).
- **Recibo Oficial Imutável:** Visualização de status de confirmação, hash da transação na blockchain (`0x...`), snapshot imutável do pedido que resiste a recarregamentos e botão de impressão estilizado.
- **Conta e Sessão:** Gerenciamento de sessão persistida em `localStorage`, recuperação automática pós-refresh e limpeza de cache seguro (`TanStack Query`) e conexões WebSocket ao realizar logout.
- **Tempo Real (Socket.IO):** Eventos `nft.updated` e `order.updated`, com deduplicação via `eventId`, descarte de versões antigas e badge "Live" no Header.

---

## 🛠 Stack Tecnológica Obrigatória

| Camada | Tecnologia Adotada | Finalidade no Projeto |
| :--- | :--- | :--- |
| **Interface** | React 18 + TypeScript 5 | Componentização tipada e declarativa |
| **Roteamento** | TanStack Router | Rotas tipadas, validação Zod de query params e proteção de sessão |
| **Estado Remoto** | TanStack Query 5 | Cache assíncrono, invalidação granular, deduplicação de requisições |
| **Transporte HTTP** | Axios | Cliente centralizado com interceptors e tratamento de erros padronizado |
| **Tempo Real** | Socket.IO Client + `@mswjs/socket.io-binding` | Sincronização bidirecional de eventos e cotações |
| **Estilização** | Tailwind CSS + Variáveis HSL | Design System KURIO (paleta de alto contraste, dark mode nativo) |
| **Componentes** | shadcn/ui pattern + Lucide React | Acessibilidade semântica, foco visível e ícones expressivos |
| **Mocking** | MSW 2.x (Mock Service Worker) | Interceptação na camada de rede com banco de dados em memória e storage |
| **Testes E2E** | Playwright | Cenários ponta a ponta em Desktop Chromium e Mobile Chromium |
| **Testes Unitários** | Vitest | Testes de domínio, contratos Zod e precisão decimal `bigint` |
| **Qualidade & Auditoria** | Lighthouse | Medição de Performance, Acessibilidade, Melhores Práticas e SEO |

---

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js >= 18.x
- Gerenciador de pacotes `pnpm` (recomendado) ou `npm`

### Passos de Instalação

```bash
# 1. Clonar ou navegar até o diretório do projeto
cd "nft-marketplace"

# 2. Instalar as dependências
pnpm install

# 3. Iniciar o servidor de desenvolvimento com mocks ativos
pnpm dev
```

A aplicação estará disponível em: `http://localhost:5173/`

---

## 🔐 Variáveis de Ambiente

O arquivo `.env.example` lista a configuração de controle dos mocks:

```env
# Ativa a simulação de API e Socket.IO via MSW no navegador
VITE_ENABLE_MOCKS=true
```

Para desabilitar os mocks e apontar para um backend real no futuro, basta alterar para `VITE_ENABLE_MOCKS=false`.

---

## 👤 Credenciais Fictícias de Demonstração

O ambiente simulado possui contas pré-configuradas para validação rápida:

| Tipo | E-mail | Senha | Carteira Principal | Saldo Inicial |
| :--- | :--- | :--- | :--- | :--- |
| **Colecionador Padrão** | `colecionador@kurio.test` | `senha123` | MetaMask Principal (`0x8ba1...BA72`) | 14.85 ETH |
| **Colecionador Convidado** | `guest@kurio.test` | `senha123` | Coinbase Wallet (`0x3C44...93BC`) | 5.20 ETH |

### Cupons de Desconto Disponíveis:
- `KURIO10`: Concede **10% de desconto** sobre o subtotal.
- `KURIO20`: Concede **20% de desconto** sobre o subtotal.
- `EXPIRED50`: Simula cupom expirado para validação de tratamento de erro.

---

## 🧪 Cenários de Simulação e Rede (MSW)

O MSW intercepta chamadas REST e eventos WebSocket através de `src/mocks/state/scenarios.ts`.
Para testar falhas determinísticas sem modificar o código, envie o header `x-mock-scenario` ou utilize o painel de testes:
- `default`: Execução com dados determinísticos e sucesso.
- `empty_catalog`: Retorna catálogo vazio para validar componentes vazios.
- `transient_error`: Simula erro temporário HTTP 503 com opção de retry.
- `rate_limit`: Simula HTTP 429 Too Many Requests.
- `session_expired`: Simula expiração de token JWT (HTTP 401).
- `payment_rejected`: Simula recusa de transação na rede blockchain.
- `price_conflict`: Simula alteração de preço durante a revisão do checkout.

---

## 📋 Scripts Disponíveis

```bash
# Executa servidor de desenvolvimento local
pnpm dev

# Executa testes unitários e de integração com Vitest
pnpm test

# Executa suíte completa de testes E2E com Playwright (Desktop e Mobile)
pnpm test:e2e

# Executa interface interativa do Playwright
pnpm test:e2e:ui

# Verificação estrita de tipos TypeScript (app e node)
pnpm typecheck

# Compila o bundle otimizado para produção com code splitting
pnpm build

# Visualiza o build de produção localmente
pnpm preview

# Executa auditoria automatizada do Lighthouse
pnpm audit:lighthouse
```

---

## 📊 Auditoria Lighthouse & Performance

Resultados reais medidos via Google Lighthouse (versão 12.8.2):

| Categoria | Score Medido | Meta Exigida | Status |
| :--- | :---: | :---: | :---: |
| **Acessibilidade** | **98** | ≥ 95 | ✅ Atingida |
| **Melhores Práticas** | **100** | ≥ 95 | ✅ Atingida (Nota Máxima) |
| **SEO** | **92** | ≥ 90 | ✅ Atingida |
| **Performance** | **55 - 59** | ≥ 90 | ℹ️ Medição em ambiente dev local sob throttling mobile |

### Otimizações Implementadas no Build:
- **Divisão Granular de Chunks (`manualChunks`):** O bundle original de 743 KB foi decomposto em chunks modulares (`vendor-react`, `vendor-tanstack`, `vendor-realtime`, `vendor-utils`), garantindo que nenhum arquivo de script ultrapasse 208 KB após minificação.
- **Metadados e Favicon:** Favicon SVG vetorial em `public/favicon.svg`, tags OpenGraph, charset UTF-8 e atributo `lang="pt-BR"`.

---

## ⚠️ Aviso sobre Dados Simulados

Este projeto foi desenvolvido estritamente para avaliação técnica de Frontend.
- Todas as operações financeiras em ETH, endereços de carteira (`0x...`), hashes de bloco e transações são **estritamente simuladas**.
- Nenhuma chave privada ou conexão com redes blockchain reais (Mainnet/Testnets reais) é solicitada ou manipulada.
- Os serviços de backend e transporte Socket.IO operam via **Mock Service Worker (MSW)** no navegador.
