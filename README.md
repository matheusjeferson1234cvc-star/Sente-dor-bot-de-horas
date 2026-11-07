# Central de Horas v5.3 — Vercel + Supabase

Painel real responsivo com login Discord, rankings, controle de presença, turnos, histórico mensal, justificativas, advertências e folgas. O bot v3.4 envia os dados para `/api/bot-sync` com segredo privado.

## GitHub pelo celular

Envie os arquivos do pacote **SITE-RAIZ-GITHUB.zip** à raiz do repositório ligado à Vercel. Depois envie os arquivos **API-GITHUB.zip** para a pasta **api** que você já criou; não misture os arquivos da API com os da raiz. O projeto completo preserva `api/*.js` dentro da pasta.

Execute `supabase.sql` novamente no SQL Editor para acrescentar as tabelas de ausência/advertências e as colunas de folgas e modo sem apagar o banco antigo.

## Variáveis privadas (Vercel, Production)

`SUPABASE_URL`, `SUPABASE_SECRET_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY`), `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `SESSION_SECRET`, `DISCORD_BOT_TOKEN`, `BOT_OWNER_DISCORD_ID`, `BOT_SYNC_SECRET`.

Redirect URI: `https://central-de-horas1.vercel.app/api/callback`. Deve ser igual ao registrado em Discord Developer Portal > OAuth2 > Redirects.

## Testar

`npm test`; `https://central-de-horas1.vercel.app/api/health` deve retornar versão 5.3.0 após o novo deploy. O proprietário global tem leitura de todos os servidores sincronizados. A edição das folgas e permissões dos servidores continua restrita ao dono de cada servidor.

**Não coloque tokens ou senhas no GitHub.**
