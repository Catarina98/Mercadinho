import { useEffect, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react';
import '../styles/access.css';

const notices = {
  offline: ['Sem ligação à internet', 'O Mercadinho precisa de internet. Volta a ligar-te para continuar.'],
  checking: ['A ligar ao Mercadinho…', 'Estamos a verificar a sessão e a carregar o inventário.'],
  error: ['Não foi possível ligar ao Mercadinho', 'Verifica a ligação à internet e tenta novamente.'],
  forbidden: ['Conta sem acesso', 'Esta conta não tem permissão para aceder ao Mercadinho.'],
  unconfigured: ['Mercadinho indisponível', 'A ligação ao inventário ainda não está configurada.']
};

export default function AccessScreen({ screen, onSignIn, onRetry, onSignOut }) {
  const heading = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = screen === 'login';

  useEffect(() => {
    heading.current?.focus();
  }, [screen]);

  async function submit(event) {
    event.preventDefault();
    if (busy || !navigator.onLine) return;
    setBusy(true);
    setError('');
    try {
      await onSignIn(email.trim(), password);
      setPassword('');
    } catch (err) {
      setError(err.code === 'invalid_credentials'
        ? 'O email ou a palavra-passe estão incorretos.'
        : 'Não foi possível iniciar sessão. Verifica a ligação e tenta novamente.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setError('');
    try {
      await onSignOut();
    } catch {
      setError('Não foi possível terminar a sessão. Tenta novamente.');
    }
  }

  return (
    <main className="access-screen" aria-labelledby="access-title">
      <section className="pos-card access-card">
        <div className="access-brand">
          <img src={import.meta.env.BASE_URL + 'logo.png'} alt="" width="48" height="48" />
          <span>Mercadinho</span>
        </div>
        <h1 id="access-title" ref={heading} tabIndex={-1}>
          {screen === 'offline' && <WifiOff size={23} aria-hidden="true" />}
          {isLogin ? 'Iniciar sessão' : notices[screen][0]}
        </h1>
        <p>{isLogin ? 'Entra com a tua conta para aceder ao inventário e às vendas.' : notices[screen][1]}</p>
        {isLogin && (
          <form className="access-form" onSubmit={submit}>
            <label>Email
              <input className="input-styled" type="email" autoComplete="username" required
                value={email} onChange={event => setEmail(event.target.value)} />
            </label>
            <label>Palavra-passe
              <input className="input-styled" type="password" autoComplete="current-password" required
                value={password} onChange={event => setPassword(event.target.value)} />
            </label>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'A iniciar sessão…' : 'Iniciar sessão'}
            </button>
          </form>
        )}
        {screen === 'error' && (
          <div className="access-actions">
            <button className="btn btn-primary" onClick={onRetry}>Tentar novamente</button>
            <button className="btn btn-secondary" onClick={signOut}>Terminar sessão</button>
          </div>
        )}
        {screen === 'forbidden' && <button className="btn btn-primary" onClick={signOut}>Entrar com outra conta</button>}
        {error && (isLogin || screen === 'forbidden' || screen === 'error') && <p className="access-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
