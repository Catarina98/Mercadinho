import { createClient } from 'npm:@supabase/supabase-js@2';
import { createClient as createSanityClient } from 'npm:@sanity/client@7';
import { timingSafeEqual } from 'node:crypto';

type Localized = string | { pt?: string; en?: string };
type Item = {
  name?: Localized;
  price?: number | string;
  wallapopUrl?: string;
  vintedUrl?: string;
};
type Product = Item & {
  _id: string;
  slug: string;
  title: Localized;
  category?: Localized;
  variants?: (Item & { id: string })[];
};

const query = '*[_type == "product" && ($id == "" || _id == $id)]{_id,"slug":coalesce(id.current,_id),title,"category":coalesce(category->title,category),price,wallapopUrl,vintedUrl,variants[]{id,name,price,wallapopUrl,vintedUrl}}';

const localized = (value?: Localized) =>
  typeof value === 'string' ? value : value?.pt || value?.en || '';

function listing(item: Item) {
  for (const value of [item.wallapopUrl, item.vintedUrl]) {
    if (!value) continue;
    try {
      const url = new URL(value.trim());
      if (url.protocol === 'https:' && /(^|\.)(wallapop\.com|wallapop\.pt)$/.test(url.hostname)) {
        return url.href;
      }
    } catch {
      // Invalid legacy links stay out of the Wallapop task list.
    }
  }
  return null;
}

function itemsFor(product: Product) {
  const title = localized(product.title);
  const variants = product.variants ?? [];
  const choices = variants.length ? variants : [{ id: '', ...product }];
  const variantIds = new Set<string>();
  return choices.map(item => {
    if (typeof item.id !== 'string' || (variants.length && !item.id.trim()) || variantIds.has(item.id)) {
      throw new Error('Invalid or duplicate Sanity variant ID for ' + product._id);
    }
    variantIds.add(item.id);
    const label = localized(item.name);
    const amount = Number(String(item.price === '' ? product.price ?? 0 : item.price ?? product.price ?? 0).replace('€', '').trim().replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid price for ' + product._id);
    return {
      id: 'sanity:' + encodeURIComponent(product._id) + ':' + encodeURIComponent(item.id),
      variant_id: item.id,
      slug: product.slug,
      name: item.id && label && label !== title ? title + ' — ' + label : title,
      price: amount,
      category: localized(product.category) || 'Amigurumi',
      wallapop_url: listing(item) ?? (choices.length === 1 ? listing(product) : null),
    };
  });
}

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });

  const secret = Deno.env.get('SANITY_CATALOG_WEBHOOK_SECRET');
  if (!secret) return Response.json({ error: 'Sync is not configured' }, { status: 503 });
  const encode = new TextEncoder();
  const expected = encode.encode(secret);
  const received = encode.encode(request.headers.get('x-mercadinho-sync-secret') ?? '');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let event: { id?: string; all?: boolean };
  try {
    event = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const fullImport = event?.all === true;
  const id = event?.id;
  if (!fullImport && (typeof id !== 'string' || !id || /^(drafts|versions)\./.test(id))) {
    return Response.json({ error: 'Missing published product ID' }, { status: 400 });
  }

  try {
    const sanity = createSanityClient({
      projectId: Deno.env.get('SANITY_PROJECT_ID'),
      dataset: Deno.env.get('SANITY_DATASET') || 'production',
      apiVersion: '2025-02-19',
      perspective: 'published',
      useCdn: false,
      token: Deno.env.get('SANITY_READ_TOKEN'),
    });
    const database = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const snapshot = new Date().toISOString();
    const products = await sanity.fetch<Product[]>(query, { id: fullImport ? '' : id });
    const current = new Map(products.map(product => [product._id, itemsFor(product)]));
    if (fullImport) {
      const { data, error } = await database.from('sanity_catalog_imports').select('document_id');
      if (error) throw error;
      for (const row of data) {
        if (!current.has(row.document_id)) current.set(row.document_id, []);
      }
    } else if (id && !current.has(id)) {
      current.set(id, []);
    }

    for (const [documentId, items] of current) {
      const { error } = await database.rpc('import_sanity_catalog', {
        document_id: documentId,
        snapshot_time: snapshot,
        catalog_items: items,
      });
      if (error) throw error;
    }
    return Response.json({ products: current.size });
  } catch (error) {
    console.error('Sanity catalog synchronization failed', error);
    return Response.json({ error: 'Catalog synchronization failed' }, { status: 503 });
  }
});
