import type { Metadata, Viewport } from 'next';
import { Shrikhand, Hind_Vadodara, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { PwaProvider } from '@/components/pwa/PwaProvider';

const shrikhand = Shrikhand({
  weight: '400',
  subsets: ['gujarati', 'latin'],
  variable: '--font-display-face',
  display: 'swap',
});

const hind = Hind_Vadodara({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['gujarati', 'latin'],
  variable: '--font-ui-face',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-data-face',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'બાળ સભા સંચાલન પ્રણાલી',
  description: 'Paldi Vistar Bal Sabha Management System',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#' + 'A81E2E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="gu"
      className={`${shrikhand.variable} ${hind.variable} ${mono.variable}`}
    >
      <body>
        <PwaProvider>
          <Providers>{children}</Providers>
        </PwaProvider>
      </body>
    </html>
  );
}
