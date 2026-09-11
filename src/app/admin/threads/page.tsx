'use client';

import { useCallback, useEffect, useState } from 'react';

interface Status {
  connected: boolean;
  channelId?: string;
  account?: string;
  error?: string;
}

const LANGUAGES = ['ja', 'en', 'es', 'pt', 'id', 'ar'];

export default function ThreadsAdminPage() {
  const [lang, setLang] = useState('ja');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState('');

  const loadStatus = useCallback(async () => {
    const response = await fetch(`/api/admin/threads/status?lang=${lang}`);
    const body = (await response.json()) as Status;
    setStatus(response.ok ? body : null);
    if (!response.ok) setMessage(body.error ?? 'Failed to load status');
  }, [lang]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) setMessage(params.get('error') as string);
    if (params.get('connected')) setMessage(`Connected: ${params.get('connected')}`);
    void loadStatus();
  }, [loadStatus]);

  async function signIn() {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    setMessage(response.ok ? 'Signed in' : 'Invalid admin token');
    setToken('');
    if (response.ok) await loadStatus();
  }

  return (
    <div style={{ maxWidth: 640, lineHeight: 1.6 }}>
      <h1>Threads publisher</h1>

      <p>
        <label>
          Account language{' '}
          <select value={lang} onChange={(event) => setLang(event.target.value)}>
            {LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
      </p>

      <section>
        <h2>1. Sign in</h2>
        <input
          type="password"
          value={token}
          placeholder="Admin token"
          onChange={(event) => setToken(event.target.value)}
        />{' '}
        <button type="button" onClick={signIn}>
          Sign in
        </button>

        <h2>2. Connect Threads</h2>
        <p>
          Authorize this app to post to the Threads profile of this language. The profile must be a
          Threads tester of the Meta app and have accepted the invitation.
        </p>
        <a href={`/api/admin/threads/auth?lang=${lang}`}>
          <button type="button">Connect Threads profile</button>
        </a>
      </section>

      {status && (
        <p>
          {status.connected
            ? `Connected: ${status.account} (${status.channelId})`
            : `Not connected${status.error ? `: ${status.error}` : ''}`}
        </p>
      )}

      {message && <p role="status">{message}</p>}
    </div>
  );
}
