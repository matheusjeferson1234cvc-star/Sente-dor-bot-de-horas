# Nero Recrutamento V2 — guia de liberação

O site de provas é separado do Nero Bot. Os candidatos não precisam fazer login via Discord, mas confirmam a posse do ID recebendo código privado do bot.

## 1. Preparar o recrutamento
1. No Nero principal, faça login Discord como administrador, selecione o servidor e clique em Recrutamento.
2. Configure o cargo de recrutador. Admins podem editar todas as 20 questões e escolher duração da prova (5 a 180 minutos, padrão 30).
3. Publique o painel Components V2 no canal escolhido (GIF, emoji, botões Participar, Meu ID, Aprovados).
4. Em Central de liberação de provas, selecione a categoria e o período total de inscrições (15 a 1440 minutos).
5. Clique em Abrir prova agora. Encerre manualmente quando quiser ou aguarde o fim do período.

## 2. Candidato
- Usa o botão Pegar meu ID no Discord e recebe o número em mensagem privada do próprio bot, depois informa esse ID no site.
- Código de oito números enviado por DM comprova a posse da conta; o site não exige OAuth.
- Uma prova por usuário e por recrutamento. Tempo individual é validado no servidor desde a primeira entrada e limitado pelo encerramento do recrutamento.
- Pode salvar rascunho e enviar. Após o prazo ou encerramento, não pode mais alterar respostas. O gabarito nunca é enviado ao candidato.

## 3. Correção e publicação
- Na aba Revisão e publicação dos aprovados, selecione o recrutamento encerrado.
- Questões objetivas têm correção exata; escritas recebem estimativa baseada em rubrica e **sempre exigem avaliação humana**. O recrutador ajusta nota e confirma a decisão.
- A nota mínima é pelo menos 50%. Para aprovar, informe nome RP e ID RP. O apelido segue [TAG] Nome | ID RP.
- Configure canal de anúncio, cargo de aprovado, TAG e se a nota aparece.
- Depois de revisar todos, confirme Publicar aprovados. O backend tenta aplicar cargos/apelidos e mandar uma mensagem única. Se falhar, consulte os logs antes de repetir para não duplicar anúncios.
- A página pública Aprovados mostra apenas decisões confirmadas e publicadas, sem respostas das provas.

## Ambiente de publicação
- Supabase: schema de recrutamento/sql/identity.sql, tabelas com RLS sem acesso público.
- Site Nero principal na Vercel: DISCORD_BOT_TOKEN, SUPABASE_URL, SUPABASE_SECRET_KEY, SESSION_SECRET, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI.
- Site Nero Recrutamento na Vercel (backend apenas): SUPABASE_URL, SUPABASE_SECRET_KEY, DISCORD_BOT_TOKEN, NERO_IDENTITY_SECRET (aleatório e com pelo menos 32 bytes), TURNSTILE_SECRET_KEY, TURNSTILE_SITE_KEY.
- Usar NERO_PUBLIC_EXAM_ENABLED=true no site público e NERO_RECRUITMENT_GO_LIVE=true no painel administrativo **somente depois de testar tudo**. Nunca colocar segredos no GitHub ou navegador.
- O bot hospedado na Discloud precisa tratar a interação nero:recruit:my-id com handleMyIdInteraction do arquivo recruitment-panel.js. A resposta é privada (ephemeral).
- **Atenção:** a Vercel de recrutamento precisa estar conectada à versão atualizada e com Root Directory recrutamento. Publicação do repositório não garante atualização automática se o projeto estiver vinculado a outro ramo.
- Não há integração do Discord via webhook ou login de candidato. Não se alteram horas ou turnos.

## Estados do processo
- closed: não aberto; open: inscrições abertas; review: revisão humana; publishing: publicação em andamento; complete: finalizado.
- Falhas na publicação podem deixar o estado publishing e exigem inspeção de logs para evitar duplicidade.
