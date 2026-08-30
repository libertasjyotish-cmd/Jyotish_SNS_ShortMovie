'use client';

import { useCallback, useEffect, useState } from 'react';

interface CreatorInfo {
  creatorNickname: string;
  creatorUsername: string;
  creatorAvatarUrl?: string;
  privacyLevelOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number;
}

interface Status {
  connected: boolean;
  channelId: string;
  accountHandle?: string;
  user?: { displayName: string; avatarUrl?: string };
  creator?: CreatorInfo;
  error?: string;
}

const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: 'Everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends',
  FOLLOWER_OF_CREATOR: 'Followers',
  SELF_ONLY: 'Only me',
};

const LANGUAGES = ['ja', 'en'];

export default function TikTokAdminPage() {
  const [lang, setLang] = useState('ja');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState('');

  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState('');
  const [disableComment, setDisableComment] = useState(false);
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);
  const [commercial, setCommercial] = useState(false);
  const [brandOrganic, setBrandOrganic] = useState(false);
  const [brandContent, setBrandContent] = useState(false);
  const [posting, setPosting] = useState(false);

  const loadStatus = useCallback(async () => {
    const response = await fetch(`/api/tiktok/status?lang=${lang}`);
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

  async function post() {
    setPosting(true);
    setMessage('');
    try {
      const response = await fetch('/api/tiktok/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          videoUrl,
          title,
          options: {
            privacyLevel,
            disableComment,
            disableDuet,
            disableStitch,
            brandOrganicToggle: commercial && brandOrganic,
            brandContentToggle: commercial && brandContent,
          },
        }),
      });
      const body = (await response.json()) as { publishId?: string; error?: string };
      setMessage(response.ok ? `Sent to TikTok (publish_id: ${body.publishId})` : (body.error ?? 'Post failed'));
    } finally {
      setPosting(false);
    }
  }

  const creator = status?.creator;
  const brandedContentPrivate = brandContent && privacyLevel === 'SELF_ONLY';
  const disclosureIncomplete = commercial && !brandOrganic && !brandContent;
  const canPost =
    Boolean(status?.connected && videoUrl && title && privacyLevel) &&
    !brandedContentPrivate &&
    !disclosureIncomplete &&
    !posting;

  return (
    <div style={{ maxWidth: 640, lineHeight: 1.6 }}>
      <h1>TikTok publisher</h1>

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

      {!status?.connected && (
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

          <h2>2. Connect TikTok</h2>
          <p>Authorize this app to post to your own TikTok account.</p>
          <a href={`/api/tiktok/auth?lang=${lang}`}>
            <button type="button">Connect TikTok account</button>
          </a>
        </section>
      )}

      {status?.connected && creator && (
        <section>
          <h2>Connected account</h2>
          <p>
            {creator.creatorAvatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.creatorAvatarUrl}
                alt=""
                width={40}
                height={40}
                style={{ borderRadius: '50%', verticalAlign: 'middle', marginRight: 8 }}
              />
            )}
            <strong>{creator.creatorNickname}</strong> (@{creator.creatorUsername})
          </p>

          <h2>Post a video</h2>
          <p>
            <label>
              Video URL
              <br />
              <input
                type="url"
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
                style={{ width: '100%' }}
              />
            </label>
          </p>
          <p>
            <label>
              Caption
              <br />
              <textarea
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                rows={3}
                style={{ width: '100%' }}
              />
            </label>
          </p>

          <p>
            <label>
              Who can view this video
              <br />
              <select
                value={privacyLevel}
                onChange={(event) => setPrivacyLevel(event.target.value)}
              >
                <option value="">Select audience</option>
                {creator.privacyLevelOptions
                  .filter((option) => !(brandContent && option === 'SELF_ONLY'))
                  .map((option) => (
                    <option key={option} value={option}>
                      {PRIVACY_LABELS[option] ?? option}
                    </option>
                  ))}
              </select>
            </label>
          </p>

          <fieldset>
            <legend>Allow users to</legend>
            <label>
              <input
                type="checkbox"
                checked={!disableComment}
                disabled={creator.commentDisabled}
                onChange={(event) => setDisableComment(!event.target.checked)}
              />{' '}
              Comment
            </label>
            <br />
            <label>
              <input
                type="checkbox"
                checked={!disableDuet}
                disabled={creator.duetDisabled}
                onChange={(event) => setDisableDuet(!event.target.checked)}
              />{' '}
              Duet
            </label>
            <br />
            <label>
              <input
                type="checkbox"
                checked={!disableStitch}
                disabled={creator.stitchDisabled}
                onChange={(event) => setDisableStitch(!event.target.checked)}
              />{' '}
              Stitch
            </label>
          </fieldset>

          <fieldset>
            <legend>Disclose video content</legend>
            <label>
              <input
                type="checkbox"
                checked={commercial}
                onChange={(event) => {
                  setCommercial(event.target.checked);
                  if (!event.target.checked) {
                    setBrandOrganic(false);
                    setBrandContent(false);
                  }
                }}
              />{' '}
              This video promotes a brand, product or service
            </label>
            {commercial && (
              <>
                <p>
                  {brandContent
                    ? 'Your video will be labeled "Paid partnership".'
                    : 'Your video will be labeled "Promotional content".'}
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={brandOrganic}
                    onChange={(event) => setBrandOrganic(event.target.checked)}
                  />{' '}
                  Your brand — promoting yourself or your own business
                </label>
                <br />
                <label>
                  <input
                    type="checkbox"
                    checked={brandContent}
                    onChange={(event) => {
                      setBrandContent(event.target.checked);
                      if (event.target.checked && privacyLevel === 'SELF_ONLY') setPrivacyLevel('');
                    }}
                  />{' '}
                  Branded content — a paid partnership with a brand
                </label>
                {disclosureIncomplete && (
                  <p>You need to indicate if your content promotes yourself, a third party, or both.</p>
                )}
                {brandedContentPrivate && <p>Branded content visibility cannot be set to private.</p>}
              </>
            )}
          </fieldset>

          <p>
            {brandContent
              ? 'By posting, you agree to TikTok\u2019s Branded Content Policy and Music Usage Confirmation.'
              : 'By posting, you agree to TikTok\u2019s Music Usage Confirmation.'}
          </p>

          <button type="button" onClick={post} disabled={!canPost}>
            {posting ? 'Posting…' : 'Post to TikTok'}
          </button>
        </section>
      )}

      {message && <p role="status">{message}</p>}
    </div>
  );
}
