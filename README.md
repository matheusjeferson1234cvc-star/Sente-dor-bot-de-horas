# Central de Horas — prévia navegável (v0.1)

Site responsivo em **HTML + CSS + JavaScript**, sem bibliotecas ou instalação. Hospedagem de arquivos estáticos na Vercel ou Netlify.

## Rodar

1. Abra `index.html` no navegador, ou execute `python3 -m http.server 8000` nesta pasta e visite `http://localhost:8000`.
2. Escolha um perfil de demonstração e clique em **Explorar painel**.
3. Navegue por Início, Ranking, Membros, Relatórios e, como dono de servidor, Permissões.

## Publicar na Vercel

Importe esta pasta como projeto estático (preset **Other**, sem build command, output directory `.`), preferencialmente via repositório Git. Alternativamente hospede em qualquer serviço de arquivos estáticos.

## O que já está implementado

- Layout preto/roxo para desktop e celular com navegação funcional.
- Modo demonstração com escolha de perfil (dono do bot / dono do servidor / administrador / membro comum).
- Seletor de servidor e visualização segregada na interface **de demonstração**.
- Resumo, rankings semanais e mensais Top 10, horas normais, extras e total.
- Meta de 2h por dia de segunda a sábado, 12h semanais, sem computar hora extra na meta.
- Pesquisa de membros, perfil e análise de cumprimento diário.
- Relatórios filtráveis por membro, situação, tipo e turno; auditoria com motivo do cancelamento.
- Controle ilustrativo de cargos autorizados do servidor, salvo no `localStorage` neste navegador.

## Ainda não está conectado

**Esta é uma prévia funcional de interface, não um sistema operacional com dados reais.** Todos os nomes, números, servidores, pontos e perfis são fictícios, e não há login Discord verdadeiro nem acesso ao Supabase. O status “demonstração” é exibido permanentemente na interface. O site não altera horas nem faz requisições ao bot.

Para produção, os próximos módulos serão:

1. Backend com OAuth2 do Discord, verificação de identidade, posse do servidor e cargos autorizados **no servidor**. O navegador não pode ser a autoridade das permissões.
2. Banco Supabase/Postgres com tabelas `guilds`, `members`, `time_cards`, `card_events`, `access_roles` e políticas de acesso por `guild_id`.
3. Adaptador no bot na Discloud que persista eventos de criação, validação, finalização e cancelamento de cartão usando credenciais **somente no servidor**.
4. API autenticada para estatísticas e relatórios, com segregação por servidor e acesso somente leitura, exceto configuração de cargos pelo dono do servidor.
5. Atualização em tempo real do ranking **apenas após validação**. Cartões cancelados não contam; horários extras não atendem metas.

**Segurança:** Nunca colocar o token do bot, o client secret OAuth ou a chave `service_role` do Supabase nos arquivos públicos deste site. Para implementar login verdadeiro será necessário backend (por exemplo Next.js com rotas de servidor ou funções serverless). A escolha do perfil na demonstração é somente visual, não autenticação.

## Regras implementadas

- Top 10 da semana e do mês, ordenado por **horas normais + horas extras validadas**, não incluindo cartões cancelados.
- Controle de metas usa **somente horas normais**.
- Sem histórico/arquivo de rankings de semanas anteriores. Histórico individual de cartões segue visível em relatórios para fins de auditoria.
- Dono do bot: visualiza todos os servidores; não edita configurações.
- Dono de servidor: apenas seu servidor; configura cargos autorizados, sem editar horas.
- Administrador: consulta os servidores autorizados; não edita horas.
- Membro comum: não tem acesso ao painel administrativo.
