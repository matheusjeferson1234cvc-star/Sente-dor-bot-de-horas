# Central de Horas v0.2 — instalação e integração

## O que já dá para testar
Abra `index.html` ou publique na Vercel. Use **Explorar painel** para testar o visual preto/roxo, rankings, membros, relatórios com abas (por turno, ativos, cancelados e histórico), horários de turnos e permissões ilustrativas. Os nomes e horas são fictícios.

## O que está preparado, mas NÃO está ligado
- `supabase.sql`: tabelas para servidores, membros, cartões e configurações, com RLS ativado.
- `api/index.js`: endpoints server-side para autenticação Discord, leitura protegida, configurações e recebimento de eventos do bot.
- `bot-bridge.js`: funções de exemplo para enviar alterações do seu bot da Discloud.
- O frontend ainda usa o **modo demo**; é necessário conectá-lo aos endpoints para mostrar os dados reais. O código original do bot não está neste pacote.

## Supabase
Crie um projeto e execute `supabase.sql` no SQL Editor. Anote a URL do projeto e a chave **service_role**, que deve ficar somente no backend Vercel.

## Discord Developer Portal
No aplicativo do seu bot, configure OAuth2 Redirect URL como `https://SEU-SITE.vercel.app/api/callback`. O bot precisa estar nos servidores, com `GuildMembers` intent habilitada para sincronizar a lista de membros.

## Vercel — Environment Variables
- `SUPABASE_URL`: URL do projeto
- `SUPABASE_SERVICE_ROLE_KEY`: chave secreta do servidor
- `DISCORD_CLIENT_ID`: ID do aplicativo
- `DISCORD_CLIENT_SECRET`: segredo OAuth
- `DISCORD_REDIRECT_URI`: `https://SEU-SITE.vercel.app/api/callback`
- `DISCORD_BOT_TOKEN`: token do bot (backend apenas)
- `BOT_OWNER_DISCORD_ID`: seu ID de usuário Discord (somente consulta global)
- `SESSION_SECRET`: valor aleatório forte, no mínimo 32 bytes
- `BOT_SYNC_SECRET`: segredo aleatório forte, compartilhado com Discloud

Nunca publique valores reais no GitHub, no HTML ou em prints.

## Discloud
Defina `CENTRAL_API_URL=https://SEU-SITE.vercel.app` e `BOT_SYNC_SECRET` igual ao da Vercel.
Integre as funções de `bot-bridge.js` nos eventos reais de criação, validação, cancelamento de cartão, atualização de membro e alteração de cargo. Eventos são idempotentes por `(guild_id, card_id)`.

## Regras de cálculo
- Meta: 120 minutos de horas normais validadas no período correto do turno.
- 5 horas normais continuam sendo 5 horas normais, não 2 + 3 extras.
- Extra: somente quando o bot marca o cartão como `Extra` em outro turno; registrar turno original.
- Cancelados não contam no ranking ou meta.
- Mudança de turno vem da alteração do cargo no Discord, sem editar horas anteriores.
- O relatório do turno deve usar a lista de membros com o cargo no momento de referência; para histórico confiável de transferências, será necessário registrar snapshots de cargos.
- Turnos que atravessam meia-noite exigem cálculo com datas e fuso configurado; a demonstração ainda simplifica esse caso.

## Para concluir a integração real
Envie o código atual do bot (sem token, senhas ou `.env`) para encaixar os eventos de cartões e membros. Depois configure as variáveis em suas próprias contas. Não é possível autenticar o Discord ou conectar o banco sem essas configurações.
