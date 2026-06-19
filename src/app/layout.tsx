import type { Metadata } from 'next';
import { Libre_Caslon_Text, DM_Sans } from 'next/font/google';
import './globals.css';

const caslonText = Libre_Caslon_Text({
  weight: ['400', '700'],
  variable: '--font-caslon',
  subsets: ['latin'],
  display: 'swap',
});

const dmSans = DM_Sans({
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FocusMixr — Ambient Sound Mixer',
  description: 'Blend ambient sounds. Let AI forge new ones. A reactive aurora experience.',
  icons: {
    icon: '/icon.svg',
  },
  appleWebApp: {
    title: 'FocusMixr',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#020617',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${caslonText.variable} ${dmSans.variable} h-full`}
    >
      <body className="min-h-full overflow-hidden bg-black antialiased" style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
