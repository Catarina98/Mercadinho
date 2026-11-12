import React, { useState } from 'react';
import { ExternalLink, RefreshCw, Store, Unlink } from 'lucide-react';
import '../styles/wallapop.css';

function StockForm({ product, onSave, onReport }) {
  const [quantity, setQuantity] = useState(product.stock_confirmed ? String(product.stock) : '');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const stock = Number(quantity);
    if (!quantity.trim() || !Number.isSafeInteger(stock) || stock < 0) return;
    setSaving(true);
    try {
      await onSave(product, stock);
      onReport('Stock guardado.');
    } catch (error) {
      onReport(error.message || 'Não foi possível guardar o stock.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="wallapop-stock-form" onSubmit={submit}>
      <label>
        Unidades disponíveis
        <input className="input-styled" type="number" min="0" step="1" required
          value={quantity} onChange={event => setQuantity(event.target.value)} />
      </label>
      <button className="btn btn-primary" disabled={saving}>Guardar stock</button>
    </form>
  );
}

function LinkInventory({ imported, products, onLink, onReport }) {
  const [existingId, setExistingId] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!existingId) return;
    setSaving(true);
    try {
      await onLink(imported, existingId);
      onReport('Artigo associado ao stock existente.');
    } catch (error) {
      onReport(error.message || 'Não foi possível associar o artigo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <details>
      <summary>Já tenho este artigo no Mercadinho</summary>
      <form className="wallapop-stock-form" onSubmit={submit}>
        <label>
          Artigo existente
          <select className="input-styled" required value={existingId} onChange={event => setExistingId(event.target.value)}>
            <option value="">Escolhe o artigo a associar</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>{product.name} · {product.stock ?? 0} un.</option>
            ))}
          </select>
        </label>
        <button className="btn btn-secondary" disabled={saving}>Associar artigo</button>
      </form>
    </details>
  );
}

function storefrontLink(product) {
  if (!product.sanity_slug) return null;
  const url = new URL('/product/' + encodeURIComponent(product.sanity_slug) + '/', 'https://fiosdaria.pt');
  if (product.sanity_variant_id) url.searchParams.set('variant', product.sanity_variant_id);
  return url.href;
}

function ListingTasks({ title, products, empty, onRemoveLink, removingId, onSelectProduct }) {
  return (
    <section className="glass-card wallapop-section">
      <h2>{title} ({products.length})</h2>
      {products.length ? (
        <ul className="wallapop-list">
          {products.map(product => {
            const productUrl = storefrontLink(product);
            return (
              <li key={product.id} className="wallapop-task">
                <div>
                  <strong>{product.name}</strong>
                  <p>{product.stock} un. em stock</p>
                </div>
                <div className="wallapop-actions">
                  {productUrl && (
                    <a className="btn btn-secondary" href={productUrl} target="_blank" rel="noopener noreferrer">
                      Ver no site <ExternalLink size={14} />
                    </a>
                  )}
                  {onRemoveLink ? (
                    <a className="btn btn-secondary" href={product.wallapop_url} target="_blank" rel="noopener noreferrer">
                      Abrir anúncio <ExternalLink size={14} />
                    </a>
                  ) : (
                    <a className="btn btn-secondary" href="https://pt.wallapop.com/" target="_blank" rel="noopener noreferrer">
                      Abrir Wallapop <ExternalLink size={14} />
                    </a>
                  )}
                  <button className="btn btn-secondary" onClick={() => onSelectProduct(product.id)}>
                    Editar stock
                  </button>
                  {onRemoveLink && (
                    <button className="btn btn-secondary wallapop-unlink" disabled={Boolean(removingId)}
                      onClick={() => onRemoveLink(product)}>
                      <Unlink size={14} />
                      {removingId === product.id ? 'A remover link…' : 'Remover link Wallapop'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p>{empty}</p>}
    </section>
  );
}

export default function WallapopView({
  products, stockProductId, onSelectProduct, onSaveStock, onLinkInventory, onRemoveLink, onRefresh, pendingSales
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const catalog = products.filter(product => product.sanity_product_id && product.sanity_active !== false);
  const remove = catalog.filter(product => product.stock_confirmed && product.stock === 0 && product.wallapop_url);
  const publish = catalog.filter(product => product.stock_confirmed && product.stock > 0 && !product.wallapop_url);
  const selected = catalog.find(product => product.id === stockProductId);
  const needsCount = catalog.filter(product => !product.stock_confirmed).length;
  const unlinked = products.filter(product => !product.sanity_product_id);

  async function refresh() {
    setBusy(true);
    try {
      const result = await onRefresh();
      setMessage(result.success ? 'Dados atualizados.' : result.message || 'Não foi possível atualizar os dados.');
    } finally {
      setBusy(false);
    }
  }

  async function removeLink(product) {
    if (removingId || !window.confirm('Já retiraste o anúncio de «' + product.name +
      '» na Wallapop? Ao continuar, o link é removido do site.')) return;
    setRemovingId(product.id);
    setMessage('');
    try {
      const result = await onRemoveLink(product);
      setMessage(result.wallapopUrl
        ? 'O link anterior foi removido. Ainda há outro link da Wallapop na ficha.'
        : result.synced ? 'Link removido do Sanity e do site.' : 'Link removido do Sanity. A lista ainda está a sincronizar.');
    } catch (error) {
      setMessage(error.message || 'Não foi possível remover o link.');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="wallapop-view">
      <div className="wallapop-heading">
        <h1><Store size={24} /> Wallapop</h1>
        <button className="btn btn-secondary" onClick={refresh} disabled={busy || Boolean(removingId)}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>
      <p>Depois de retirares um anúncio na Wallapop, remove o link nesta lista. Para novos anúncios, cola o link na ficha no Sanity.</p>
      {message && <p role="status">{message}</p>}
      {pendingSales > 0 && <p role="status">Vendas por sincronizar: {pendingSales}. Carrega em Atualizar quando tiveres rede.</p>}

      <section className="glass-card wallapop-section">
        <h2>Stock dos produtos do site</h2>
        {needsCount > 0 && <p>Artigos com stock por confirmar: {needsCount}</p>}
        {catalog.length ? (
          <>
            <label>
              Artigo
              <select className="input-styled" value={selected?.id || ''} onChange={event => onSelectProduct(event.target.value)}>
                <option value="">Escolhe um produto ou variante</option>
                {catalog.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}{product.stock_confirmed ? '' : ' (stock por confirmar)'}
                  </option>
                ))}
              </select>
            </label>
            {selected && <StockForm key={selected.id + ':' + selected.stock_confirmed + ':' + selected.stock}
              product={selected} onSave={onSaveStock} onReport={setMessage} />}
            {selected && !selected.stock_confirmed && unlinked.length > 0 && (
              <LinkInventory key={selected.id} imported={selected} products={unlinked}
                onLink={onLinkInventory} onReport={setMessage} />
            )}
          </>
        ) : <p>Ainda não há artigos importados do Sanity.</p>}
      </section>

      <ListingTasks title="Retirar da Wallapop" products={remove} onRemoveLink={removeLink} removingId={removingId}
        empty="Não há artigos esgotados com anúncio associado." onSelectProduct={onSelectProduct} />
      <ListingTasks title="Publicar na Wallapop" products={publish}
        empty="Não há artigos em stock sem link da Wallapop." onSelectProduct={onSelectProduct} />
    </div>
  );
}
