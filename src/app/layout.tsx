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
        <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>{children}</main>
      </body>
    </html>
  );
}
