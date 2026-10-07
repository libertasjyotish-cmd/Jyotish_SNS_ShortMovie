'use client';

import { useCallback, useEffect, useState } from 'react';

interface WeekSummary {
  week_id: string;
  total: number;
  held: number;
  script_done: number;
  script_error: number;
  rendered: number;
  render_error: number;
  render_pending: number;
  posted: number;
  post_error: number;
}

interface QueueStatus {
  checked_at: string;
  dispatch_enabled: boolean;
  dispatch_languages: string[];
  weeks: WeekSummary[];
  script_errors: string[];
  render_errors: string[];
  post_errors: string[];
  overdue_count: number;
  error?: string;
}

/** Every button is a scheduled job, described by what it fixes rather than by its cron name. */
const JOBS: { job: string; label: string; note: string; params?: Record<string, string> }[] = [
  { job: 'weekly-plan', label: '今週分の枠を作る', note: '週の128枠をキューに作る（週1回・月曜に自動実行）' },
  { job: 'weekly-generate', label: '原稿を作る', note: '原稿が無い枠だけ生成する（Geminiを使う）' },
  { job: 'render-batch', label: '動画を作る', note: '原稿済みで未レンダーの枠を30sでレンダリングする' },
  {
    job: 'render-batch',
    label: '65s動画を作る',
    note: '手動TikTok用。自動では作らないので、アップロードする週だけ押す',
    params: { patterns: '65s' },
  },
  { job: 'daily-dispatch', label: '投稿する', note: '投稿時刻を過ぎた枠をYouTube・Instagram等へ投稿する' },
  { job: 'watchdog', label: '詰まりを直す', note: '止まったレンダー・原稿を検知して再投入する' },
  { job: 'expire-weekly', label: '先週分を取り下げる', note: '期限切れの週次投稿を非公開にする' },
];

const CELLS: { key: keyof WeekSummary; label: string }[] = [
  { key: 'total', label: '枠' },
  { key: 'script_done', label: '原稿' },
  { key: 'rendered', label: '動画' },
  { key: 'posted', label: '投稿' },
  { key: 'render_pending', label: 'レンダー待ち' },
  { key: 'script_error', label: '原稿NG' },
  { key: 'render_error', label: '動画NG' },
  { key: 'post_error', label: '投稿NG' },
  { key: 'held', label: '保留' },
];

export default function AdminDashboard() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [message, setMessage] = useState('');
  const [running, setRunning] = useState('');

  const loadStatus = useCallback(async () => {
    const response = await fetch('/api/admin/queue-status');
    const body = (await response.json()) as QueueStatus;
    if (!response.ok) {
      setStatus(null);
      setMessage(response.status === 401 ? '管理トークンでサインインしてください' : (body.error ?? '取得に失敗しました'));
      return;
    }
    setStatus(body);
    setMessage('');
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function signIn() {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    setToken('');
    if (!response.ok) {
      setMessage('管理トークンが違います');
      return;
    }
    await loadStatus();
  }

  async function run(job: string, label: string, params: Record<string, string> = {}) {
    if (!window.confirm(`${label} を実行します。よろしいですか。`)) return;
    setRunning(label);
    setMessage(`${label} を実行中…`);
    try {
      const query = new URLSearchParams({ job, ...params });
      const response = await fetch(`/api/admin/run?${query}`, { method: 'POST' });
      const body = (await response.json()) as { error?: string; result?: unknown };
      setMessage(
        response.ok
          ? `${label} 完了: ${JSON.stringify(body.result)}`
          : `${label} 失敗: ${body.error ?? JSON.stringify(body)}`,
      );
    } catch (error) {
      setMessage(`${label} 失敗: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setRunning('');
      await loadStatus();
    }
  }

  const weeks = (status?.weeks ?? []).slice(-3).reverse();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16, lineHeight: 1.6 }}>
      <h1>配信パイプライン</h1>

      {!status && (
        <section>
          <input
            type="password"
            value={token}
            placeholder="管理トークン"
            onChange={(event) => setToken(event.target.value)}
          />{' '}
          <button type="button" onClick={signIn}>
            サインイン
          </button>
        </section>
      )}

      {message && <p style={{ whiteSpace: 'pre-wrap' }}>{message}</p>}

      {status && (
        <>
          <p>
            自動投稿: {status.dispatch_enabled ? 'オン' : 'オフ'}（{status.dispatch_languages.join(', ')}）
            ／ 投稿待ち超過: {status.overdue_count}件 ／ 取得 {new Date(status.checked_at).toLocaleString('ja-JP')}{' '}
            <button type="button" onClick={() => void loadStatus()}>
              更新
            </button>
          </p>

          <table cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>週</th>
                {CELLS.map((cell) => (
                  <th key={cell.key}>{cell.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week.week_id} style={{ borderTop: '1px solid #ddd' }}>
                  <td>{week.week_id}</td>
                  {CELLS.map((cell) => (
                    <td key={cell.key} style={{ textAlign: 'center' }}>
                      {week[cell.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <h2>操作</h2>
          <p>どのボタンも自動実行と同じ処理です。二重に押しても未処理の枠だけが進みます。</p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {JOBS.map((item) => (
              <li key={item.label} style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  disabled={running !== ''}
                  onClick={() => void run(item.job, item.label, item.params)}
                >
                  {running === item.label ? '実行中…' : item.label}
                </button>{' '}
                <span style={{ color: '#555' }}>{item.note}</span>
              </li>
            ))}
          </ul>

          <h2>個別ページ</h2>
          <ul>
            <li>
              <a href="/admin/threads">Threads 接続</a>
            </li>
            <li>
              <a href="/admin/tiktok">TikTok 手動投稿</a>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
