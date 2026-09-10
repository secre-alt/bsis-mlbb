import { useState } from 'react';
import { X } from 'lucide-react';

export default function LoginModal({ onClose, onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    const { error: signInError } = await onSignIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) {
      // Generic message — don't reveal whether the email exists.
      setError('Incorrect email or password.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-md border border-ink-700 bg-ink-900 p-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ember-500">
              Organizer access
            </p>
            <h2 className="mt-1 font-display text-xl font-bold">Sign in</h2>
            <p className="mt-1 text-xs text-ink-500">
              Standings and results are public. Only organizers can edit.
            </p>
          </div>
          <button onClick={onClose} className="text-ink-600 hover:text-ink-300" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-ink-500">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sm border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-ember-500"
              placeholder="organizer@bsis.edu"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-ink-500">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-ember-500"
              placeholder="••••••••"
            />
          </div>

          <div className="min-h-[18px] text-xs font-medium text-blood-500">{error}</div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-sm bg-ember-500 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="block w-full text-center text-xs font-semibold text-ink-500 hover:text-ink-300"
          >
            Cancel — view only
          </button>
        </form>

        {/* <p className="mt-5 border-t border-ink-800 pt-4 text-[10px] leading-relaxed text-ink-600">
          Organizer accounts are created in the Supabase dashboard, not here —
          there's no public sign-up. See the README for setup.
        </p> */}
      </div>
    </div>
  );
}
