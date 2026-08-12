import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Field, Notice, Panel } from '../components/ui-kit';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-3xl font-medium tracking-tight">Sign in</h1>

      <Panel className="mt-8">
        <form className="space-y-5 p-5" onSubmit={submit}>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Password"
            type="password"
            minLength={8}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <Notice>{error}</Notice> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Working...' : 'Sign in'}
          </Button>
        </form>
        <div className="border-t border-border px-5 py-4 text-xs text-muted-foreground">
          No account yet?{' '}
          <Link to="/signup" className="underline hover:text-foreground">
            Create one
          </Link>
        </div>
      </Panel>
    </div>
  );
}
