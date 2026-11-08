# Central de Horas v5.8.2 — permissões de administrador no site

Painel de administração integrado ao Discord, Vercel, Supabase e bot Discord v3.7.1.

## Permissões

- **Dono do servidor Discord:** visualiza e edita.
- **Usuário com a permissão Discord Administrador (bit 8) em um cargo do servidor:** visualiza e edita configurações do site, folgas, permissões de acesso, turnos, cargos, canais e opções do bot.
- **Cargos configurados apenas para consulta:** podem visualizar os relatórios, não editar.
- **Membros não autorizados:** sem acesso.
- **Dono global do bot:** continua com acesso de leitura ao laboratório; para editar outros servidores sem ser administrador ou dono do servidor, deve autorizar explicitamente o ID em `BOT_OWNER_EDIT_GUILDS`.

A decisão de permissão é feita exclusivamente pelo backend usando dados atualizados da API Discord do bot (não depende do nome do cargo ou de valores do navegador). O endpoint `/api/data` informa `canEdit` para mostrar ou ocultar as opções correspondentes na interface.

## Instalação

Ver **INSTALAR-V5.8.2.txt**. Atualizar site raiz + pasta `api` na Vercel. Sem alteração de SQL. O bot v3.7.1 existente já é compatível e não foi modificado nesta correção.

## Testes

- `npm test` no site: 55 testes aprovados.
- `npm test` no bot v3.7.1, sem modificações: 68 testes aprovados.
- Execução real no Discord, Supabase e Vercel ainda não confirmada.

## Observação

No bot v3.7.1, os comandos administrativos internos ainda usam a permissão **Gerenciar Servidor**, que é uma regra separada da permissão oficial **Administrador** exigida para editar pelo site.
