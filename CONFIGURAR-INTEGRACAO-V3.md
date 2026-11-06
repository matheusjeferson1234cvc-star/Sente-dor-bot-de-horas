# Integração v3.2 do bot com o site

Este pacote contém dois projetos separados: o bot modificado para Discloud e o site para Vercel.

## 1. Supabase
Crie um projeto no Supabase. No SQL Editor, execute `supabase.sql` do pacote do site. Guarde a Project URL e a chave secreta **service_role**.

## 2. Discord Developer Portal
Na aplicação do bot, habilite **Server Members Intent** e adicione o redirect OAuth2 `https://SEU-SITE.vercel.app/api/callback`. O site autentica com a conta Discord e verifica se a pessoa é dona do servidor ou possui um cargo permitido. O dono do bot, configurado por ID, pode consultar os servidores sincronizados.

## 3. Vercel
Publique a pasta do site, incluindo `api/index.js`, `real.html` e `real.js`. Configure as variáveis privadas no projeto Vercel:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI` (URL completa terminando em `/api/callback`)
- `DISCORD_BOT_TOKEN` (mesmo token usado na Discloud, mas somente nas variáveis privadas)
- `BOT_OWNER_DISCORD_ID` (seu ID de usuário Discord)
- `SESSION_SECRET` (segredo aleatório longo)
- `BOT_SYNC_SECRET` (outro segredo aleatório longo)

## 4. Discloud
Envie o pacote do bot atualizado. Mantenha as variáveis que ele já usa, inclusive `DISCORD_TOKEN`, e acrescente:

- `CENTRAL_API_URL=https://SEU-SITE.vercel.app`
- `BOT_SYNC_SECRET` com o mesmo valor da Vercel

A cada 60 segundos, o bot sincroniza membros, avatares, cargos, cartões individuais, horários e cargos de turnos. Também sincroniza quando recebe eventos de mudança de cargos. O painel real está em `/real.html`. A demonstração antiga permanece em `/`.

## 5. Primeira configuração de acesso
O dono do servidor precisa configurar os cargos que podem consultar o site. O endpoint `POST /api/settings?guildId=...` aceita JSON com `allowedRoles` (IDs dos cargos administrativos), `shiftRoles` e `shiftHours`. O backend restringe alterações ao dono do servidor. **Ainda falta a tela de edição real de permissões**; a tela antiga é demonstrativa. Enquanto isso, o dono do servidor e o dono do bot podem consultar.

## Limitações conhecidas
- O ranking real em `/real.html` soma os registros sincronizados e mostra Top 10 total; filtros semanal/mensal ainda serão adicionados.
- O relatório de ausentes usa os cargos atuais, não uma fotografia histórica. Transferências antigas exigem snapshots para auditoria histórica.
- A tela real ainda não consolida automaticamente um fechamento imutável ao terminar cada turno.
- A regra de 2h por dia, exceto domingo, ainda não é consolidada no backend.
- Horários que cruzam meia-noite e divisão de cartões entre datas ainda precisam de ajustes antes do uso oficial.
- As horas ativas são aproximadas e atualizadas a cada minuto. Horas canceladas nunca contam.
- O banco local JSON do bot continua sendo a fonte original. Mantenha backups do arquivo `data/database.json` da Discloud.
- Não há deploy ou teste de conexão com contas reais neste ambiente; faça a configuração com suas credenciais privadas.
