# Central de Horas v5.5 — Login e navegação redesenhados

Versão para Vercel usando a API existente com 12 funções. O login oficial continua em `/api/login`.

## Novo visual

- Login em duas colunas no PC e versão compacta no celular, com botão de entrada Discord.
- Navegação lateral fixa no PC, menu deslizante e barra inferior no celular.
- Visão geral inicial com resumos, atalhos e registros recentes.
- Seções de controle de presença, ranking, turnos, relatórios, justificativas, advertências, folgas e permissões, com seus dados reais.
- Laboratório do dono do sistema: aberto apenas quando a API reconhece o usuário em `BOT_OWNER_DISCORD_ID`. Permite prévia de modo de ponto, turno e folga, e consulta simulada de advertências via `/api/warnings-preview`. **Nenhum dado real é alterado no laboratório.**
- A administração do servidor continua controlando as permissões dos cargos no servidor respectivo. O dono global tem consulta e simulações, não edição de terceiros.

## Publicação

1. **Não apague o repositório nem o banco.** Faça backup do que já existe.
2. Envie os arquivos do ZIP `SITE-RAIZ` para a raiz do repositório GitHub conectado à Vercel.
3. Dentro da pasta `api` já existente no GitHub, envie os arquivos do ZIP `API` da mesma versão (sem colocar esses arquivos na raiz).
4. Confira a lista da pasta `api`. Deve haver 12 funções. Se houver um `time-off.js` de versão antiga, remova **somente esse arquivo**, pois a rota é tratada em `api/index.js`.
5. Verifique na Vercel as variáveis **sem divulgar os valores**: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `SESSION_SECRET`, `DISCORD_BOT_TOKEN`, `BOT_SYNC_SECRET`, `BOT_OWNER_DISCORD_ID`. Se já estiverem configuradas, não precisam ser alteradas.
6. Aguarde **Production / Ready**. Teste `/api/health` (esperado: `5.5.0`) e o login com Discord.
7. Para o dono testar, entre no site pelo Discord e escolha **Laboratório do dono** no menu. O ID usado é sempre o ID da conta autenticada, verificado na API, não um campo livre.

## Observações

Esta versão muda a **interface do site** e não inclui atualizações do bot. Os dados do Supabase e da Discloud não são alterados por estes arquivos. Os testes locais usam sessões e dados simulados; login e permissões em produção precisam ser validados após o deploy. Nunca envie tokens ou chaves ao GitHub.
