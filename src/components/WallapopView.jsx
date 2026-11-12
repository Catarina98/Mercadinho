import React, { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Store } from 'lucide-react';
import { db } from '../db/storage';
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

function ListingTasks({ title, products, empty, remove, onSelectProduct }) {
  return (
    <section className="glass-card wallapop-section">
      <h2>{title} ({products.length})</h2>
      {products.length ? (
        <ul className="wallapop-list">
          {products.map(product => (
            <li key={product.id} className="wallapop-task">
              <div>
                <strong>{product.name}</strong>
                <p>{product.stock} un. em stock</p>
              </div>
              <div className="wallapop-actions">
                {remove ? (
                  <a className="btn btn-secondary" href={product.wallapop_url} target="_blank" rel="noopener noreferrer">
                    Abrir anúncio <ExternalLink size={14} />
                  </a>
                ) : (
                  <>
                    <a className="btn btn-secondary" href={'https://fiosdaria.pt/product/' + encodeURIComponent(product.sanity_slug) + '/'} target="_blank" rel="noopener noreferrer">
                      Ver produto <ExternalLink size={14} />
                    </a>
                    <a className="btn btn-secondary" href="https://pt.wallapop.com/" target="_blank" rel="noopener noreferrer">
                      Abrir Wallapop <ExternalLink size={14} />
                    </a>
                  </>
                )}
                <button className="btn btn-secondary" onClick={() => onSelectProduct(product.id)}>
                  Editar stock
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p>{empty}</p>}
    </section>
  );
}

export default function WallapopView({
  products, stockProductId, onSelectProduct, onSaveStock, onLinkInventory, onRefresh, pendingSales
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const catalog = products.filter(product => product.sanity_product_id && product.sanity_active !== false);
  const remove = catalog.filter(product => product.stock_confirmed && product.stock === 0 && product.wallapop_url);
  const publish = catalog.filter(product => product.stock_confirmed && product.stock > 0 && !product.wallapop_url);
  const selected = catalog.find(product => product.id === stockProductId);
  const needsCount = catalog.filter(product => !product.stock_confirmed).length;
  const unlinked = products.filter(product => !product.sanity_product_id);

  useEffect(() => {
    let active = true;
    db.ensureSupabase().then(async service => {
      if (!service.client) return;
      const { data } = await service.client.auth.getSession();
      if (active) setSignedIn(Boolean(data.session));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function refresh() {
    setBusy(true);
    try {
      const result = await onRefresh();
      setMessage(result.success ? 'Dados atualizados.' : result.message || 'Não foi possível atualizar os dados.');
    } finally {
      setBusy(false);
    }
  }

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const service = await db.ensureSupabase();
      await service.signIn(email.trim(), password);
      setPassword('');
      setSignedIn(true);
      const result = await onRefresh();
      setMessage(result.success ? 'Dados atualizados.' : result.message || 'Não foi possível atualizar os dados.');
    } catch (error) {
      setMessage(error.message || 'Não foi possível iniciar sessão.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wallapop-view">
      <div className="wallapop-heading">
        <h1><Store size={24} /> Wallapop</h1>
        <button className="btn btn-secondary" onClick={refresh} disabled={busy}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>
      <p>Depois de publicares ou retirares um anúncio, atualiza o respetivo link no Sanity.</p>
      {message && <p role="status">{message}</p>}
      {pendingSales > 0 && <p role="status">Vendas por sincronizar: {pendingSales}. Carrega em Atualizar quando tiveres rede.</p>}

      {!signedIn && (
        <form className="glass-card wallapop-section wallapop-login" onSubmit={signIn}>
          <h2>Acesso ao inventário</h2>
          <label>Email<input className="input-styled" type="email" autoComplete="username" required
            value={email} onChange={event => setEmail(event.target.value)} /></label>
          <label>Palavra-passe<input className="input-styled" type="password" autoComplete="current-password" required
            value={password} onChange={event => setPassword(event.target.value)} /></label>
          <button className="btn btn-primary" disabled={busy}>Iniciar sessão</button>
        </form>
      )}

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

      <ListingTasks title="Retirar da Wallapop" products={remove} remove
        empty="Não há artigos esgotados com anúncio associado." onSelectProduct={onSelectProduct} />
      <ListingTasks title="Publicar na Wallapop" products={publish}
        empty="Não há artigos em stock sem link da Wallapop." onSelectProduct={onSelectProduct} />
    </div>
  );
}
