# Apoiador, pagamento e transparência (13.3, 13.4, 13.5; base do 13.2)

Desenho de 26/11/2026. **Status: rascunho para decisão do dono antes do beta** (fevereiro de 2027).
Nada é implementado antes da aprovação deste documento.

## Intenção

Empatar as contas do ArcanaKin (custo medido no `/admin`, 13.1) com apoio voluntário de pessoas
e, depois, com o plano das lojas, **sem tirar nada de quem não paga** e sem pôr nada que envolva
cartas atrás de pagamento (Política de Conteúdo de Fãs da Wizards of the Coast).

## Decisões já tomadas pelo dono

- Provedor de pagamento: **Asaas** (assinatura no cartão e Pix Automático, nota fiscal automática,
  conta para MEI).
- Preços: **Apoiador R$ 9,90/mês ou R$ 99/ano**; **Loja R$ 79/mês** (13.2).
- Transparência (13.5) sai **junto com o Apoiador**: custo do mês por categoria × apoio recebido,
  sem nomes, valores por pessoa nem faturas.
- MEI ou CNPJ: **em consulta com a contadora** (muda a nota fiscal e a estimativa de 15% de
  impostos e taxas do painel de custos).

## Objetivos

1. Uma pessoa vira Apoiadora em poucos toques, por Pix ou cartão, mensal ou anual.
2. O benefício liga e desliga sozinho conforme o pagamento (sem trabalho manual do admin).
3. A receita aparece no painel de custos (13.1) e na página pública de transparência.
4. A mesma base serve depois para o plano das lojas (13.2).

## Não objetivos

- Compra dentro do app (as lojas de apps cobram 15–30% e exigem o sistema delas): o app **só
  mostra o estado** do apoio, sem botão nem link de compra.
- Anúncios (13.6, depois do beta).
- Lucro: a meta é o custo do mês mais impostos e taxas.

## Anti-objetivos (se acontecer, falhou mesmo funcionando)

- Algo de cartas (decks, coleção, análise, imagens, proxies, trilha) passa a exigir pagamento.
- Alguém perde algo que já tinha (ex.: quem já está em 5 grupos é tirado de algum).
- Dado de cartão passa pelos nossos servidores.
- Apoio vira "pagar para aparecer" na descoberta de lojas.

## Abordagens consideradas

| Abordagem                                                                  | Prós                                                                                                                             | Contras                                                                                               |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **A. Fatura do Asaas (página de pagamento deles) + avisos por webhook** ✅ | Cartão e Pix sem dado sensível no nosso servidor (sem PCI); Asaas cuida de cobrança, nova tentativa, recibo e nota; pouco código | A pessoa sai do ArcanaKin para pagar (volta por um link)                                              |
| B. Checkout próprio com a API (cartão tokenizado no navegador)             | Fica tudo na nossa tela                                                                                                          | Mais código, mais risco (dados de cartão no navegador da nossa página, CSP), mais testes de segurança |
| C. Link de pagamento manual + admin liga o benefício                       | Zero código de integração                                                                                                        | Não escala, esquece de desligar, sem renovação automática                                             |

**Escolha: A.** O Apoiador é um valor pequeno e esporádico; a segurança e a simplicidade valem mais
que manter a pessoa na nossa tela.

## Como funciona (visão da pessoa)

1. Em **`/apoiar`** (link no rodapé, no `/conta` e na página de transparência): o que o apoio paga
   (custo do mês × apoio), os benefícios e dois botões: **"R$ 9,90 por mês"** e **"R$ 99 por ano
   (2 meses grátis)"**.
2. Ao escolher, a pessoa informa **CPF** (exigido pelo Asaas e pela nota fiscal) e escolhe **Pix ou
   cartão** na página do Asaas.
   - Mensal no cartão: renova sozinho.
   - Mensal no Pix: **Pix Automático** (autoriza uma vez no banco, renova sozinho).
   - Anual: uma cobrança por ano; perto do fim, lembrete por e-mail com o link da renovação (ou
     renovação automática no cartão).
3. Pagamento confirmado → volta para `/apoiar/obrigado`; o selo e os benefícios aparecem na hora
   (pelo aviso do Asaas; a página espera alguns segundos e atualiza).
4. Em **`/conta` → Apoio**: plano, próxima cobrança, recibos (link do Asaas), **trocar de plano** e
   **cancelar** (mantém até o fim do período pago). Nos **7 primeiros dias** do primeiro pagamento,
   "cancelar e pedir reembolso" (direito de arrependimento do Código de Defesa do Consumidor para
   compra pela internet).
5. Pagamento atrasado: aviso na central e por e-mail; o benefício continua por **7 dias de
   carência**; depois volta ao gratuito, sem apagar nada.

## Benefícios do Apoiador (13.3)

Tudo é ferramenta de organização; **nada de cartas**.

| Benefício                  | Gratuito                                                      | Apoiador                               | Observação                                                                                          |
| -------------------------- | ------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Selo no perfil             | —                                                             | "Apoiador" (e há quanto tempo)         | Aparece no perfil e na lista de membros; dá para esconder                                           |
| Grupos                     | **até 3 grupos criados** (a definir: criados ou participando) | sem limite                             | **Novo limite**: só vale para criar grupo novo; quem já tem mais não perde nada                     |
| Histórico das estatísticas | últimos 12 meses no painel                                    | todo o histórico                       | Os dados nunca são apagados; quem volta a apoiar vê tudo de novo                                    |
| Temas da mesa              | tema padrão                                                   | temas extras                           | **Funcionalidade nova** (cores/fundo do modo mesa); pode ficar para depois do lançamento            |
| Prioridade nos pedidos     | —                                                             | marcado no `/admin`                    | O feedback de Apoiador aparece primeiro para o admin                                                |
| **Grupo apoiado**          | —                                                             | o grupo todo ganha os limites de grupo | Ex.: histórico completo das estatísticas do grupo; vale enquanto a pessoa apoiar e estiver no grupo |

## Transparência (13.5)

- Página pública **`/transparencia`** ("Quanto custa manter o ArcanaKin"), no rodapé.
- Mostra: custo do mês **por categoria** (hospedagem, banco de dados, e-mails, imagens, monitoramento,
  domínio, lojas de apps — a partir dos lançamentos do 13.1), **apoio recebido no mês** (soma
  líquida dos pagamentos), **% coberto** com barra e texto, e os últimos 6 meses numa tabela.
- Nunca mostra: nomes, quantidade de pessoas por valor, faturas, observações dos lançamentos.
- Botão "Apoiar" → `/apoiar`.
- O painel de custos do `/admin` passa a mostrar a receita real (hoje fixa em zero).

## Desenho técnico

### Dados (novas tabelas)

- `subscriptions`: `id`, `payer_type` (`user` | `store`), `user_id` / `store_id`, `plan`
  (`supporter_monthly` | `supporter_yearly` | `store_monthly`), `status` (`pending` | `active` |
  `overdue` | `cancelled` | `ended`), `asaas_customer_id`, `asaas_subscription_id`,
  `current_period_end`, `cancel_at_period_end`, `created_at`.
- `payments`: `id`, `subscription_id`, `asaas_payment_id` (único), `amount_cents`, `net_cents`
  (líquido, depois da taxa do Asaas), `method` (`pix` | `card`), `status`, `paid_at`,
  `refunded_at`, `invoice_url`.
- `payment_events`: `id` do evento do Asaas (único, para não processar duas vezes), tipo, recebido
  em, processado em.
- **CPF não é guardado no nosso banco**: vai só para o Asaas, que precisa dele para cobrar e emitir
  a nota. Guardamos só o id do cliente no Asaas.

### Regra pura (`packages/core/src/billing`)

- `entitlements(subscriptions, now)` → `{ supporter: boolean, since, until, graceUntil }`, com a
  carência de 7 dias.
- Limites (`FREE_GROUP_LIMIT = 3`, `FREE_STATS_MONTHS = 12`) e a regra "não tira o que já tem".
- Mapeamento categoria ↔ serviço para a transparência.

### Integração com o Asaas (`apps/web/src/server/asaas.ts`)

- Cliente HTTP fino (criar cliente, criar assinatura, consultar pagamento, cancelar, reembolsar),
  com tempo limite e erros de domínio, como os outros serviços externos.
- **Webhook** `POST /api/webhooks/asaas`:
  - confere o token do cabeçalho (segredo `ASAAS_WEBHOOK_TOKEN`, comparação em tempo constante);
  - grava o evento (idempotente pelo id);
  - **não confia no corpo**: busca o pagamento na API do Asaas antes de mudar qualquer estado;
  - eventos tratados: pagamento confirmado/recebido (estende `current_period_end`), vencido
    (`overdue`, começa a carência), estornado/reembolsado, assinatura cancelada.
- Variáveis de ambiente (configuradas pelo dono na Vercel, nunca no repositório): `ASAAS_API_KEY`,
  `ASAAS_WEBHOOK_TOKEN`, `ASAAS_ENV` (`sandbox` nos previews, `production` em produção).
- CSP: só o redirecionamento para a página do Asaas (sem script deles na nossa página).

### Rotas e telas

- `POST /api/v1/billing/checkout` (plano) → cria cliente/assinatura no Asaas e devolve o link.
- `GET /api/v1/billing` (estado e recibos da pessoa), `POST /api/v1/billing/cancel`,
  `POST /api/v1/billing/refund` (só nos 7 dias).
- Telas: `/apoiar`, `/apoiar/obrigado`, `/conta` → Apoio, `/transparencia`, selo no perfil, aviso
  de limite ao criar o 4º grupo (com "Apoiar" e explicação), receita no painel de custos.
- App: selo e estado do apoio no perfil (só leitura), sem link de compra.
- **Atrás de uma flag** (`payments`, como a `card-scanner`): primeiro só o grupo do dono, com o
  Asaas em modo de teste (sandbox) nos previews; depois produção.

### Privacidade (LGPD) e segurança

- Política de privacidade atualizada: Asaas como operador (nome, e-mail, CPF, pagamentos).
- Exportação de dados inclui assinaturas e pagamentos; exclusão de conta cancela a assinatura no
  Asaas e anonimiza os pagamentos (mantidos pelo prazo fiscal).
- Nada de cartão no nosso servidor; nada de chave ou token em log.
- Casos novos em `autorizacao.test.ts` (recibos de outra pessoa, cancelar a assinatura de outra
  pessoa → 404).

### Testes

- Core: direitos com carência, período anual, limites sem tirar o que já tem.
- Serviço: eventos fora de ordem e repetidos (idempotência), pagamento estornado, cancelamento no
  fim do período.
- Webhook: token errado → 401; evento repetido não estende duas vezes; corpo adulterado não muda
  nada (o estado vem da consulta à API).
- E2E: fluxo com o Asaas simulado (checkout → aviso de pagamento → selo aparece → cancelar).

## Etapas (um PR por etapa)

1. **Base**: tabelas, regra de direitos, cliente do Asaas, webhook, flag `payments`. Sem tela.
2. **Apoiador**: `/apoiar`, `/conta` → Apoio, selo, limite de grupos e histórico, prioridade no
   feedback, estado no app.
3. **Transparência e receita**: `/transparencia` e receita real no painel de custos.
4. **Nota fiscal automática** (depende da contadora: MEI ou CNPJ, inscrição municipal).
5. **Plano Loja (13.2)**: mesma base, pagador = loja; limites de eventos/inscritos, avisos extras,
   relatório de público e exportar a lista.
6. Temas da mesa (pode vir depois do lançamento).

## Em aberto (decisão do dono)

1. **MEI ou CNPJ** (contadora): define a nota fiscal e a taxa de impostos do painel.
2. **Limite de 3 grupos**: conta os grupos que a pessoa **criou** (minha sugestão: não atrapalha
   quem é convidado) ou todos em que **participa**?
3. **"Grupo apoiado"**: quais limites de grupo o apoio libera — sugestão: histórico completo das
   estatísticas do grupo (é o único limite de grupo que existe neste desenho).
4. **Temas da mesa** no lançamento ou depois?
5. **Confirmação com a Wizards e com um advogado** (regra da fase 13) antes de ativar em produção.
6. **Conta no Asaas**: abrir, configurar o webhook e pôr as chaves na Vercel (Production e Preview).

## O que fica com quem implementar

Textos de interface (pt-BR e en), layout das telas seguindo o padrão do site, nomes internos,
mensagens de erro e a ordem exata dos campos do checkout.
