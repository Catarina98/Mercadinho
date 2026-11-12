import { useId, useState } from 'react';
import { Copy, Download, Link2 } from 'lucide-react';

async function downloadPhoto(imageUrl, name) {
  const url = new URL(imageUrl);
  if (url.origin !== 'https://cdn.sanity.io' || !url.pathname.startsWith('/images/')) throw new Error('Invalid image URL');
  const response = await fetch(url, { signal: AbortSignal.timeout?.(15000) });
  if (!response.ok) throw new Error('Photo download failed');
  const photo = await response.blob();
  if (!photo.type.startsWith('image/')) throw new Error('Invalid photo response');
  const link = document.createElement('a');
  const blobUrl = URL.createObjectURL(photo);
  link.href = blobUrl;
  const filename = name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
  link.download = (filename || 'fios-da-ria') + '.jpg';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export default function WallapopPublishing({ product, onPrepare, onAssociate }) {
  const panelId = useId();
  const [panel, setPanel] = useState('');
  const [draft, setDraft] = useState(null);
  const [url, setUrl] = useState('');
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function download(imageUrl) {
    try {
      await downloadPhoto(imageUrl, product.name);
      setFeedback('Imagem descarregada.');
    } catch {
      setFeedback('Não foi possível descarregar a imagem. Podes abri-la e guardá-la manualmente.');
    }
  }

  async function prepare() {
    if (panel === 'draft') {
      setPanel('');
      return;
    }
    setPanel('draft');
    setFeedback('');
    if (draft) return;
    setWorking(true);
    try {
      const content = await onPrepare(product);
      setDraft(content);
      if (content.imageUrl) await download(content.imageUrl);
    } catch (error) {
      setFeedback(error.message || 'Não foi possível preparar o anúncio.');
    } finally {
      setWorking(false);
    }
  }

  async function copy(text, label, event) {
    const field = event.currentTarget.previousElementSibling;
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(label + ' copiado.');
    } catch {
      field?.focus();
      field?.select();
      setFeedback('Selecionámos o texto. Copia-o para o usares na Wallapop.');
    }
  }

  async function associate(event) {
    event.preventDefault();
    if (!url.trim() || working) return;
    setWorking(true);
    setFeedback('');
    try {
      await onAssociate(product, url.trim());
    } catch (error) {
      setFeedback(error.message || 'Não foi possível associar o link.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="wallapop-publishing">
      <button type="button" className="btn btn-secondary" onClick={prepare} disabled={working}
        aria-expanded={panel === 'draft'} aria-controls={panelId + '-draft'}>
        <Download size={14} /> Preparar anúncio
      </button>
      <button type="button" className="btn btn-secondary" disabled={working}
        aria-expanded={panel === 'link'} aria-controls={panelId + '-link'}
        onClick={() => { setPanel(panel === 'link' ? '' : 'link'); setFeedback(''); }}>
        <Link2 size={14} /> Associar link
      </button>

      {panel === 'draft' && (
        <div className="wallapop-publishing-panel" id={panelId + '-draft'}>
          {working && !draft && <p role="status">A preparar o anúncio…</p>}
          {draft && (
            <>
              <p>Revê o texto e copia-o para o anúncio na Wallapop.</p>
              <label htmlFor={panelId + '-title'}>Título</label>
              <div className="wallapop-copy-field">
                <input id={panelId + '-title'} className="input-styled" value={draft.title}
                  onChange={event => setDraft({ ...draft, title: event.target.value })} />
                <button type="button" className="btn btn-secondary" disabled={!draft.title.trim()}
                  onClick={event => copy(draft.title, 'Título', event)}><Copy size={14} /> Copiar título</button>
              </div>
              <label htmlFor={panelId + '-description'}>Descrição</label>
              <div className="wallapop-copy-field">
                <textarea id={panelId + '-description'} className="input-styled" rows={6} value={draft.description}
                  onChange={event => setDraft({ ...draft, description: event.target.value })} />
                <button type="button" className="btn btn-secondary" disabled={!draft.description.trim()}
                  onClick={event => copy(draft.description, 'Texto', event)}><Copy size={14} /> Copiar descrição</button>
              </div>
              {draft.imageUrl ? (
                <div className="wallapop-actions">
                  <button type="button" className="btn btn-secondary" disabled={working}
                    onClick={() => download(draft.imageUrl)}><Download size={14} /> Descarregar imagem</button>
                  <a className="btn btn-secondary" href={draft.imageUrl} target="_blank" rel="noopener noreferrer">Abrir imagem</a>
                </div>
              ) : <p>Esta peça não tem uma imagem própria no Sanity. Podes procurar uma foto na ficha do site.</p>}
            </>
          )}
          {feedback && <p role="status">{feedback}</p>}
        </div>
      )}

      {panel === 'link' && (
        <form className="wallapop-publishing-panel" id={panelId + '-link'} onSubmit={associate}>
          <label htmlFor={panelId + '-url'}>Link do anúncio publicado na Wallapop</label>
          <div className="wallapop-copy-field">
            <input type="url" required id={panelId + '-url'} className="input-styled"
              placeholder="https://pt.wallapop.com/item/…" value={url}
              onChange={event => setUrl(event.target.value)} />
            <button type="submit" className="btn btn-primary" disabled={working || !url.trim()}>
              {working ? 'A guardar…' : 'Guardar link'}
            </button>
          </div>
          {feedback && <p role="status">{feedback}</p>}
        </form>
      )}
    </div>
  );
}
