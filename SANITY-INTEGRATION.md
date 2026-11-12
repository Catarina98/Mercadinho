# Ligar o Mercadinho ao catálogo Fios da Ria

O Sanity mantém as fichas e os links dos anúncios. O Mercadinho guarda o stock por artigo ou variante no Supabase. A página pública só consulta a disponibilidade confirmada. As vendas, quantidades e restantes tabelas do Mercadinho ficam atrás de autenticação.

## Ativação

1. Exporta uma cópia do inventário e das vendas no Mercadinho. Se o histórico estiver apenas num dispositivo, sincroniza-o com o projeto Supabase correto antes da primeira importação do Sanity.
2. No Supabase, cria ou identifica o utilizador em **Authentication → Users**. Aplica a migração em `supabase/migrations` sobre a base do Mercadinho. A migração substitui as permissões de demonstração. Regista o UUID autorizado com `insert into public.mercadinho_operators (user_id) values ('UUID-DO-UTILIZADOR');`. Se a base for nova, executa primeiro o SQL de criação das tabelas disponível nas definições do Mercadinho.
3. Publica esta versão do Mercadinho. Define as variáveis de publicação `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com a URL do projeto e a chave pública, ou configura a ligação nas definições do Mercadinho. Abre **Wallapop → Iniciar sessão** com a conta criada no passo anterior.
4. Define os segredos da função `sanity-catalog` no Supabase: `SANITY_PROJECT_ID`, `SANITY_DATASET` (normalmente `production`) e `SANITY_CATALOG_WEBHOOK_SECRET` (um valor aleatório e privado). Usa `SANITY_READ_TOKEN` só se o dataset exigir autenticação. Publica a função com `supabase functions deploy sanity-catalog --project-ref PROJETO`, a partir deste repositório. O gateway valida o JWT anónimo do projeto e a função valida o cabeçalho privado do webhook.
5. No Sanity, cria um webhook para o dataset do site, com eventos **Create**, **Update** e **Delete** e com o envio de eventos de rascunhos e versões desativado.
   - URL: `https://PROJETO.supabase.co/functions/v1/sanity-catalog`.
   - Cabeçalhos HTTP: `Authorization: Bearer CHAVE-ANON-LEGADA` e `x-mercadinho-sync-secret` com o mesmo valor do segredo da função.
   - Filtro GROQ: `before()._type == "product" || after()._type == "product"`.
   - Projeção GROQ: `{"id": coalesce(after()._id, before()._id)}`.
6. Para importar as fichas já publicadas, faz um POST autenticado com os mesmos cabeçalhos e o corpo `{"all":true}`. Pode ser feito na ferramenta **Test** da Edge Function no painel do Supabase. O resultado indica quantas fichas processou.
7. No repositório do Fios da Ria, configura as variáveis do GitHub Actions `NEXT_PUBLIC_MERCADINHO_SUPABASE_URL` e `NEXT_PUBLIC_MERCADINHO_SUPABASE_PUBLISHABLE_KEY`. Usa exclusivamente a chave pública do Supabase. Publica a versão do site com esta integração.

## Trabalho diário

- Publica ou atualiza fichas no Sanity. Atualiza o Mercadinho no separador **Wallapop** para veres as fichas já sincronizadas.
- Nos artigos novos, confirma a quantidade. Se já tens o artigo no Mercadinho, usa **Já tenho este artigo no Mercadinho** para manter o registo, o stock e o código que já tinhas.
- Regista as vendas no POS. A última unidade retira o botão de compra quando a página consulta o stock. Vendas sem rede ficam pendentes até à sincronização. O ajuste manual de stock requer ligação ao Supabase.
- Em **Retirar da Wallapop**, abre o anúncio, retira-o manualmente e apaga o link na ficha do Sanity. Confirma também o campo legado se o anúncio estiver guardado aí.
- Em **Publicar na Wallapop**, publica manualmente e cola o link no produto ou variante do Sanity. Os artigos sem ficha no Sanity continuam disponíveis no Mercadinho.
- Uma página nova do Fios da Ria continua a precisar da publicação normal do GitHub Pages. As mudanças de stock das páginas que já existem são lidas quando abres a página.

[Webhooks no Sanity](https://www.sanity.io/docs/content-lake/webhooks) · [Funções no Supabase](https://supabase.com/docs/guides/functions/deploy) · [Permissões das tabelas](https://supabase.com/docs/guides/database/postgres/row-level-security)
