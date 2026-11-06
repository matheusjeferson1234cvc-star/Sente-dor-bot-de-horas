# Central de Horas — painel de produção

A página inicial (`index.html`) é o painel real com login Discord. A interface antiga de demonstração fica isolada em `/demo.html`.

## Publicação

1. Atualize os arquivos do mesmo projeto da Vercel (`central-de-horas1`) pela origem de implantação usada (por exemplo, repositório GitHub). **Não crie um novo projeto**.
2. Na Vercel, configure as variáveis indicadas em `CONFIGURACAO-V4.txt`, todas no ambiente de Produção, mantendo os valores secretos somente no painel de variáveis. Salve e faça um novo deploy.
3. No aplicativo Discord Developer Portal > OAuth2 > Redirects, adicione `https://central-de-horas1.vercel.app/api/callback` e use o mesmo endereço em `DISCORD_REDIRECT_URI`.
4. Rode `supabase.sql` no SQL Editor se ainda não criou as três tabelas. Não execute novamente por obrigação caso elas já tenham sido criadas.
5. Atualize e reinicie o bot na Discloud; confirme `CENTRAL_API_URL` e `BOT_SYNC_SECRET` com o mesmo segredo do site.
6. Confira `/api/health`, faça login, selecione um servidor sincronizado e teste as horas e as permissões com usuários reais.

## Segurança

Nunca publique `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, `BOT_SYNC_SECRET` ou `SUPABASE_SECRET_KEY` no código. Elas devem ser variáveis **privadas do servidor** da Vercel. O arquivo `.env` preenchido não deve ser versionado.

## Verificação local

`node --test tests/api.test.js`

Os testes simulam serviços externos e não comprovam o deploy real. Login, permissões e sincronização só podem ser confirmados depois da implantação e configuração das credenciais.
