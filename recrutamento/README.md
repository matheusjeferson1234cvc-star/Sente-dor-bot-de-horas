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

## Como liberar uma prova

1. No projeto `nero-recrutamento` da Vercel, configure `SUPABASE_SECRET_KEY`, `DISCORD_BOT_TOKEN`, `TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`. A URL do Supabase, o segredo privado de identidade e a trava de inscrições já foram cadastrados. Nunca cole tokens no GitHub nem no navegador do candidato.
2. Depois de conferir as integrações, defina `NERO_PUBLIC_EXAM_ENABLED=true` **no projeto separado de recrutamento** e faça um novo deploy de produção. `/api/pronto` deve responder `ready:true` antes de abrir qualquer prova.
3. Entre no painel principal `central-de-horas1.vercel.app` pelo Discord, selecione o servidor e abra `Recrutamento`.
4. No editor da categoria Polícia RP ou Organização RP, ajuste as 20 perguntas, a nota mínima e o tempo individual (5 a 180 minutos), e clique em `Salvar perguntas`.
5. Em `Central de liberação de provas`, escolha a categoria e por quanto tempo as inscrições ficarão abertas. Clique em `Abrir prova agora`. O período de inscrições é diferente do tempo individual de cada candidato.
6. Se quiser encerrar antecipadamente, clique em `Encerrar prova agora`. O backend verifica o cargo verdadeiro do recrutador no Discord e bloqueia novas respostas quando a rodada fecha.

**Observações:** publicar um painel no Discord não abre inscrições; o botão para abrir só funciona quando a integração pública estiver pronta. O prazo da prova é validado pelo servidor, não pelo relógio do navegador. Correção das questões escritas, revisão e publicação de aprovados exigem um módulo administrativo de avaliação separado. O botão de obter ID no Discord requer que o bot em Discloud tenha conectado o evento `interactionCreate` ao manipulador `handleMyIdInteraction`.
