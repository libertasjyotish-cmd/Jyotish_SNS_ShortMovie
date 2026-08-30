import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Libertas Jyotish',
};

export default function Privacy() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>Last updated: August 30, 2026</p>

      <h2>1. Who we are</h2>
      <p>
        Libertas Jyotish operates Libertas Jyotish Publisher (&quot;the Service&quot;), an
        internal tool that publishes short astrology videos to social media accounts owned by
        Libertas Jyotish. The Service has no public sign-up and collects no data from visitors.
      </p>

      <h2>2. Data we process</h2>
      <p>
        When the account owner connects a social media account, the Service stores the OAuth
        access token, refresh token and token expiry, plus the public account identifier
        (user id, display name, avatar URL) returned by the platform. For TikTok this data is
        obtained through the <code>user.info.basic</code>, <code>video.upload</code> and
        <code>video.publish</code> scopes. No data about other users, viewers or followers is
        collected.
      </p>

      <h2>3. How we use it</h2>
      <p>
        Tokens and identifiers are used solely to display which account is connected and to
        upload and publish videos to that account. They are never sold, shared with third
        parties, or used for advertising or profiling.
      </p>

      <h2>4. Storage and retention</h2>
      <p>
        Credentials are stored in a private Google Sheets workspace and in encrypted
        environment variables, accessible only to the account owner. They are retained until
        the account is disconnected or the owner revokes access on the platform, at which
        point the stored tokens are deleted.
      </p>

      <h2>5. Your choices</h2>
      <p>
        The account owner can revoke the Service&apos;s access at any time in the settings of
        the respective platform (for TikTok: Settings and privacy &rarr; Security and
        permissions &rarr; Apps and services). Deletion of stored data can also be requested
        via the contact address below.
      </p>

      <h2>6. Contact</h2>
      <p>
        Privacy questions: <a href="mailto:libertasjyotish@gmail.com">libertasjyotish@gmail.com</a>
      </p>
    </>
  );
}
