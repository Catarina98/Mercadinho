import { createClient } from 'npm:@supabase/supabase-js@2';
import { createClient as createSanityClient } from 'npm:@sanity/client@7';

type Listing = { wallapopUrl?: string; vintedUrl?: string };
type Variant = Listing & { _key: string; id: string };
type Product = Listing & { _id: string; _rev: string; variants?: Variant[] };
const fields = ['wallapopUrl', 'vintedUrl'] as const;
const query = '*[_type == "product" && _id in $ids]{_id,_rev,wallapopUrl,vintedUrl,variants[]{_key,id,wallapopUrl,vintedUrl}}';

function wallapopUrl(value?: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && !url.username && !url.password &&
      /(^|\.)(wallapop\.com|wallapop\.pt)$/.test(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function targetScopes(product: Product, variantId: string, isDraft = false) {
  const variants = product.variants ?? [];
  const scopes: { item: Listing; prefix: string }[] = [];
  if (variantId) {
    const matching = variants.filter(variant => variant.id === variantId);
    if (matching.length === 0 && isDraft) return scopes;
    if (matching.length !== 1 || !matching[0]._key) {
      throw new RequestError(409, 'A variante mudou no Sanity. Atualiza a lista antes de continuar.');
    }
    const variant = matching[0];
    scopes.push({ item: variant, prefix: 'variants[_key==' + JSON.stringify(variant._key) + '].' });
  } else if (variants.length) {
    if (isDraft) return scopes;
    throw new RequestError(409, 'A ficha tem variantes novas no Sanity. Atualiza a lista antes de continuar.');
  }
  if (variants.length <= 1) scopes.push({ item: product, prefix: '' });
  return scopes;
}

function currentLink(product: Product, variantId: string) {
  for (const { item } of targetScopes(product, variantId)) {
    for (const field of fields) {
      const link = wallapopUrl(item[field]);
      if (link) return link;
    }
  }
  return null;
}

function pathsToRemove(product: Product, variantId: string, expectedUrl: string, isDraft: boolean) {
  return targetScopes(product, variantId, isDraft).flatMap(({ item, prefix }) =>
    fields.filter(field => wallapopUrl(item[field]) === expectedUrl).map(field => prefix + field),
  );
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': Deno.env.get('MERCADINHO_ORIGIN') || 'https://catarina98.github.io',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
}

function json(body: object, status = 200) {
  return Response.json(body, { status, headers: corsHeaders() });
}

async function syncCatalog(projectUrl: string, anonKey: string, documentId: string) {
  const secret = Deno.env.get('SANITY_CATALOG_WEBHOOK_SECRET');
  if (!secret) return false;
  try {
    const response = await fetch(projectUrl + '/functions/v1/sanity-catalog', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + anonKey,
        'x-mercadinho-sync-secret': secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: documentId }),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  if (request.method !== 'POST') return json({ error: 'Pedido inválido.' }, 405);
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Inicia sessão no Mercadinho.' }, 401);

  try {
    const projectUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const database = createClient(projectUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: auth } },
    });
    const { data: user, error: authError } = await database.auth.getUser(auth.slice(7));
    if (authError || !user.user) throw new RequestError(401, 'Volta a iniciar sessão no Mercadinho.');
    const permission = await database.rpc('is_mercadinho_operator');
    if (permission.error) throw permission.error;
    if (permission.data !== true) throw new RequestError(403, 'A tua conta não tem acesso ao inventário.');

    const body = await request.json().catch(() => null);
    const rowId = body?.productId;
    const expectedUrl = wallapopUrl(body?.expectedUrl);
    if (typeof rowId !== 'string' || !rowId || rowId.length > 512 || !expectedUrl) {
      throw new RequestError(400, 'Não foi possível identificar o artigo e o anúncio.');
    }

    const { data: product, error } = await database.from('products')
      .select('sanity_product_id,sanity_variant_id,sanity_active,stock_confirmed,stock,wallapop_url')
      .eq('id', rowId)
      .maybeSingle();
    if (error) throw error;
    const documentId = product?.sanity_product_id;
    if (!documentId || !product.sanity_active || /^(drafts|versions)\./.test(documentId)) {
      throw new RequestError(404, 'Este artigo já não está no catálogo publicado.');
    }
    if (!product.stock_confirmed || product.stock !== 0) {
      throw new RequestError(409, 'O stock do artigo mudou. Atualiza a lista antes de continuar.');
    }
    if (product.wallapop_url && wallapopUrl(product.wallapop_url) !== expectedUrl) {
      throw new RequestError(409, 'O link do anúncio mudou. Atualiza a lista antes de continuar.');
    }

    const token = Deno.env.get('SANITY_WALLAPOP_WRITE_TOKEN');
    if (!token) throw new RequestError(503, 'A remoção automática ainda não está configurada.');
    const sanity = createSanityClient({
      projectId: Deno.env.get('SANITY_PROJECT_ID'),
      dataset: Deno.env.get('SANITY_DATASET') || 'production',
      apiVersion: '2025-02-19',
      perspective: 'raw',
      useCdn: false,
      timeout: 6000,
      maxRetries: 0,
      token,
    });
    const draftId = 'drafts.' + documentId;
    const ids = [documentId, draftId];
    const documents = await sanity.fetch<Product[]>(query, { ids });
    const published = documents.find(doc => doc._id === documentId);
    if (!published) throw new RequestError(404, 'A ficha já não está publicada no Sanity.');
    const variantId = product.sanity_variant_id;
    const existing = currentLink(published, variantId);
    if (existing && existing !== expectedUrl) {
      throw new RequestError(409, 'O link no Sanity mudou. Atualiza a lista antes de continuar.');
    }

    const transaction = sanity.transaction();
    let pending = false;
    for (const document of documents) {
      if (!ids.includes(document._id)) continue;
      const paths = pathsToRemove(document, variantId, expectedUrl, document._id === draftId);
      if (!paths.length) continue;
      pending = true;
      transaction.patch(document._id, patch => patch.ifRevisionId(document._rev).unset(paths));
    }
    if (pending) {
      try {
        await transaction.commit({ visibility: 'sync' });
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode === 409) {
          throw new RequestError(409, 'A ficha foi editada entretanto. Atualiza a lista e tenta novamente.');
        }
        throw error;
      }
    }

    // The webhook is also triggered by the published mutation. Import directly so the task
    // list can be updated immediately, including on a retry after a lost response.
    const [current] = await sanity.fetch<Product[]>(query, { ids: [documentId] });
    const synced = await syncCatalog(projectUrl, anonKey, documentId);
    return json({ wallapopUrl: current ? currentLink(current, variantId) : null, synced });
  } catch (error) {
    if (error instanceof RequestError) return json({ error: error.message }, error.status);
    console.error('Wallapop link removal failed');
    return json({ error: 'Não foi possível confirmar a remoção do link. Tenta novamente.' }, 503);
  }
});
