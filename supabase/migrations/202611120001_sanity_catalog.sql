begin;

alter table public.products
  add column if not exists sanity_product_id text,
  add column if not exists sanity_variant_id text not null default '',
  add column if not exists sanity_slug text,
  add column if not exists sanity_active boolean not null default true,
  add column if not exists wallapop_url text,
  add column if not exists stock_confirmed boolean not null default true;

create unique index if not exists products_sanity_reference
  on public.products (sanity_product_id, sanity_variant_id)
  where sanity_product_id is not null;

create table if not exists public.mercadinho_operators (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.sanity_catalog_imports (
  document_id text primary key,
  fetched_at timestamptz not null
);
create table if not exists public.mercadinho_catalog_sales (
  sale_id text primary key
);
alter table public.mercadinho_operators enable row level security;
alter table public.sanity_catalog_imports enable row level security;
alter table public.mercadinho_catalog_sales enable row level security;
revoke all on public.mercadinho_operators, public.sanity_catalog_imports,
  public.mercadinho_catalog_sales from public, anon, authenticated;
grant select on public.sanity_catalog_imports to service_role;

create or replace function public.is_mercadinho_operator()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.mercadinho_operators where user_id = auth.uid());
$$;
revoke all on function public.is_mercadinho_operator() from public, anon;
grant execute on function public.is_mercadinho_operator() to authenticated;

-- Replace the demo policies. Restrictive policies also constrain any project-specific grants.
do $$
declare relation text;
begin
  foreach relation in array array['products', 'sales', 'categories', 'markets'] loop
    execute format('alter table public.%I enable row level security', relation);
    execute format('revoke all on public.%I from public, anon', relation);
    execute format('grant select, insert, update, delete on public.%I to authenticated', relation);
    execute format('drop policy if exists %I on public.%I', 'Allow public all ' || relation, relation);
    execute format('drop policy if exists mercadinho_access on public.%I', relation);
    execute format('drop policy if exists mercadinho_operator_required on public.%I', relation);
    execute format('create policy mercadinho_access on public.%I for all to authenticated using ((select public.is_mercadinho_operator())) with check ((select public.is_mercadinho_operator()))', relation);
    execute format('create policy mercadinho_operator_required on public.%I as restrictive for all to authenticated using ((select public.is_mercadinho_operator())) with check ((select public.is_mercadinho_operator()))', relation);
  end loop;
end $$;

drop policy if exists catalog_insert on public.products;
drop policy if exists catalog_update on public.products;
drop policy if exists catalog_delete on public.products;
create policy catalog_insert on public.products as restrictive for insert to authenticated
  with check (sanity_product_id is null and id not like 'sanity:%');
create policy catalog_update on public.products as restrictive for update to authenticated
  using (sanity_product_id is null) with check (sanity_product_id is null and id not like 'sanity:%');
create policy catalog_delete on public.products as restrictive for delete to authenticated
  using (sanity_product_id is null);

create or replace function public.import_sanity_catalog(
  document_id text, snapshot_time timestamptz, catalog_items jsonb
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.sanity_catalog_imports as previous (document_id, fetched_at)
  values (document_id, snapshot_time)
  on conflict on constraint sanity_catalog_imports_pkey do update
    set fetched_at = excluded.fetched_at
    where previous.fetched_at < excluded.fetched_at;
  if not found then return; end if;

  insert into public.products as product (
    id, name, price, category, stock, stock_confirmed, sanity_product_id,
    sanity_variant_id, sanity_slug, wallapop_url, sanity_active
  )
  select item.id, item.name, item.price, item.category, 0, false, document_id,
    item.variant_id, item.slug, item.wallapop_url, true
  from jsonb_to_recordset(catalog_items) as item(
    id text, name text, price numeric, category text, variant_id text, slug text, wallapop_url text
  )
  on conflict (sanity_product_id, sanity_variant_id) where sanity_product_id is not null
  do update set
    name = excluded.name,
    price = excluded.price,
    category = excluded.category,
    sanity_slug = excluded.sanity_slug,
    wallapop_url = excluded.wallapop_url,
    sanity_active = true
  where (product.name, product.price, product.category, product.sanity_slug, product.wallapop_url, product.sanity_active)
    is distinct from (excluded.name, excluded.price, excluded.category, excluded.sanity_slug, excluded.wallapop_url, true);

  update public.products as product set sanity_active = false
  where product.sanity_product_id = document_id and product.sanity_active
    and not exists (
      select 1 from jsonb_array_elements(catalog_items) as item
      where item->>'variant_id' = product.sanity_variant_id
    );
end;
$$;
revoke all on function public.import_sanity_catalog(text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.import_sanity_catalog(text, timestamptz, jsonb) to service_role;

-- The storefront receives one boolean per confirmed item, without access to inventory tables.
create or replace function public.get_catalog_availability(product_ids text[])
returns table(sanity_product_id text, sanity_variant_id text, available boolean)
language sql stable security definer set search_path = ''
as $$
  select p.sanity_product_id, p.sanity_variant_id, p.sanity_active and coalesce(p.stock, 0) > 0
  from public.products p
  where p.sanity_product_id = any(product_ids) and (p.stock_confirmed or not p.sanity_active);
$$;
revoke all on function public.get_catalog_availability(text[]) from public;
grant execute on function public.get_catalog_availability(text[]) to anon, authenticated;

create or replace function public.link_catalog_inventory(imported_id text, existing_id text)
returns public.products
language plpgsql security definer set search_path = ''
as $$
declare imported public.products; linked public.products;
begin
  if not public.is_mercadinho_operator() then
    raise exception 'Acesso ao inventário não autorizado.' using errcode = '42501';
  end if;
  select * into imported from public.products where id = imported_id;
  if not found or imported.sanity_product_id is null then
    raise exception 'Atualiza a lista de produtos do Sanity.' using errcode = '22023';
  end if;
  perform 1 from public.sanity_catalog_imports where document_id = imported.sanity_product_id for update;
  select * into imported from public.products where id = imported_id for update;
  if not found or not imported.sanity_active or imported.stock_confirmed then
    raise exception 'Só podes associar uma variante com stock por confirmar.' using errcode = '22023';
  end if;
  delete from public.products where id = imported_id;
  update public.products as p set
    sanity_product_id = imported.sanity_product_id, sanity_variant_id = imported.sanity_variant_id,
    sanity_slug = imported.sanity_slug, wallapop_url = imported.wallapop_url,
    name = imported.name, price = imported.price, category = imported.category,
    sanity_active = true, stock_confirmed = p.stock is not null
  where p.id = existing_id and p.sanity_product_id is null
  returning * into linked;
  if not found then
    raise exception 'O artigo existente tem de estar sincronizado e ainda disponível para associar.' using errcode = '22023';
  end if;
  return linked;
end;
$$;
revoke all on function public.link_catalog_inventory(text, text) from public, anon;
grant execute on function public.link_catalog_inventory(text, text) to authenticated;

create or replace function public.set_catalog_stock(
  product_id text, expected_stock integer, expected_confirmed boolean, new_stock integer
)
returns public.products
language plpgsql security definer set search_path = ''
as $$
declare updated public.products;
begin
  if not public.is_mercadinho_operator() then
    raise exception 'Acesso ao inventário não autorizado.' using errcode = '42501';
  end if;
  if new_stock is null or new_stock < 0 then
    raise exception 'Indica uma quantidade válida.' using errcode = '22023';
  end if;
  update public.products set stock = new_stock, stock_confirmed = true, updated_at = now()
  where id = product_id and sanity_product_id is not null and sanity_active
    and ((stock is not distinct from expected_stock and stock_confirmed = expected_confirmed)
      or (stock = new_stock and stock_confirmed))
  returning * into updated;
  if not found then
    raise exception 'O stock mudou. Atualiza os dados e volta a tentar.' using errcode = '40001';
  end if;
  return updated;
end;
$$;
revoke all on function public.set_catalog_stock(text, integer, boolean, integer) from public, anon;
grant execute on function public.set_catalog_stock(text, integer, boolean, integer) to authenticated;

create or replace function public.record_catalog_sale(sale jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  line record;
  existing_stock integer;
  confirmed boolean;
begin
  if not public.is_mercadinho_operator() then
    raise exception 'Acesso ao inventário não autorizado.' using errcode = '42501';
  end if;
  if jsonb_typeof(sale->'items') is distinct from 'array' or coalesce(sale->>'id', '') = '' then
    raise exception 'Venda inválida.' using errcode = '22023';
  end if;

  insert into public.mercadinho_catalog_sales(sale_id) values (sale->>'id') on conflict do nothing;
  if not found then return; end if;

  insert into public.sales (
    id, timestamp, date_str, market, items, subtotal, discount, total, payment_method,
    amount_received, change, notes
  ) values (
    sale->>'id', (sale->>'timestamp')::timestamptz, sale->>'dateStr', sale->>'market',
    sale->'items', (sale->>'subtotal')::numeric, (sale->>'discount')::numeric,
    (sale->>'total')::numeric, sale->>'paymentMethod', (sale->>'amountReceived')::numeric,
    (sale->>'change')::numeric, sale->>'notes'
  ) on conflict (id) do nothing;
  if not found then return; end if;

  -- Lock rows in ID order so simultaneous sales cannot both consume the same unit.
  for line in
    select item->>'id' as product_id, sum((item->>'quantity')::integer) as quantity,
      bool_and(coalesce((item->>'quantity')::integer > 0, false)) as valid
    from jsonb_array_elements(sale->'items') as item
    group by item->>'id'
    order by item->>'id'
  loop
    if not line.valid then
      raise exception 'Quantidade inválida numa linha da venda.' using errcode = '22023';
    end if;
    select stock, stock_confirmed into existing_stock, confirmed
      from public.products where id = line.product_id for update;
    if not found then
      if line.product_id like 'sanity:%' then
        raise exception 'Um artigo do catálogo já não existe.' using errcode = '22023';
      end if;
    elsif not confirmed or (existing_stock is not null and existing_stock < line.quantity) then
      raise exception 'Stock insuficiente para o artigo %.', line.product_id using errcode = '22023';
    elsif existing_stock is not null then
      update public.products set stock = existing_stock - line.quantity, updated_at = now()
        where id = line.product_id;
    end if;
  end loop;
end;
$$;
revoke all on function public.record_catalog_sale(jsonb) from public, anon;
grant execute on function public.record_catalog_sale(jsonb) to authenticated;

commit;
