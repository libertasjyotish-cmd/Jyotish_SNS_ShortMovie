import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Libertas Jyotish',
};

export default function Terms() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p>Last updated: August 30, 2026</p>

      <h2>1. Service</h2>
      <p>
        Libertas Jyotish Publisher (&quot;the Service&quot;) is an internal tool operated by
        Libertas Jyotish that generates short astrology videos and publishes them to social
        media accounts owned by Libertas Jyotish, including YouTube, Instagram and TikTok.
        The Service is not offered to the general public and has no end-user accounts.
      </p>

      <h2>2. Content</h2>
      <p>
        All published content is produced for entertainment purposes only and does not
        constitute medical, legal, financial or psychological advice.
      </p>

      <h2>3. Third-party platforms</h2>
      <p>
        The Service uses the official APIs of YouTube, Instagram and TikTok. Use of those
        platforms is additionally governed by their own terms and policies. Access tokens are
        obtained through each platform&apos;s standard OAuth flow with the account owner&apos;s
        consent, and are used only to publish content to those accounts.
      </p>

      <h2>4. Disclaimer</h2>
      <p>
        The Service is provided &quot;as is&quot;, without warranty of any kind. Libertas
        Jyotish is not liable for any damages arising from its use or from interruptions of
        third-party platforms.
      </p>

      <h2>5. Contact</h2>
      <p>
        Questions about these terms: <a href="mailto:libertasjyotish@gmail.com">libertasjyotish@gmail.com</a>
      </p>
    </>
  );
}
