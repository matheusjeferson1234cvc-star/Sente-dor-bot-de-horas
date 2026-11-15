# Nero Recrutamento · Painel Components V2

Site separado do Nero principal, com inscrições fechadas por padrão e dados isolados por ID de servidor.

## Painel Discord
- Layout Components V2 (flag 32768), GIF original nero-loop.gif e botões Participar da prova, Pegar meu ID e Aprovados.
- A duração da prova é configurável no editor do painel principal (5 a 180 minutos; padrão 30).
- GIF de servidor opcional via HTTPS terminando em .gif. O emoji animado do servidor precisa de nome e ID válidos; sem esses dados aparecem emojis comuns.
- A página pública oferece abas Prova e Aprovados. A API de aprovados retorna apenas resultados confirmados e publicados, nunca rascunhos, respostas ou gabaritos.

## Integração pendente no bot Discloud
O botão Pegar meu ID envia a custom_id nero:recruit:my-id. O código do bot que recebe interactionCreate precisa chamar a função handleMyIdInteraction exportada por recruitment-panel.js. A função responde de modo privado ao autor do clique, com o ID obtido diretamente da interação Discord.

## Configuração e segurança
- Aplicar a migração SQL de recrutamento/sql/identity.sql no projeto Supabase adequado após revisar e testar.
- Configurar SUPABASE_URL, SUPABASE_SECRET_KEY, DISCORD_BOT_TOKEN, NERO_IDENTITY_SECRET, TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY somente no backend Vercel, sem enviar segredos ao repositório.
- NERO_PUBLIC_EXAM_ENABLED fica desligado até implementar e testar envio de provas, prazo por candidato, correção, revisão humana e publicação oficial.
- Salvar a duração configura a prova, mas o bloqueio automático por tempo ainda depende do módulo de submissão que não está concluído.
- A aba Aprovados funciona como consulta a registros oficialmente publicados; as aprovações só poderão ser escritas pelo backend administrativo autorizado, ainda pendente.
- Nenhuma alteração nas contagens do bate-ponto.
