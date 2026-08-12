import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Libertas Jyotish Automation",
  description: "Zero-GUI Full-Code Pipeline for Short Videos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h1>System is running...</h1>
          <p>This is a background API server. No GUI is provided.</p>
        </main>
        <div style={{ display: 'none' }}>{children}</div>
      </body>
    </html>
  );
}
