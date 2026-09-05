import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '@/lib/store';
import { AppFrame } from '@/components/AppFrame';
import { AppLock } from '@/components/AppLock';

export const metadata: Metadata = {
  title: 'TrustPay — a second pair of eyes before you pay',
  description:
    'An Indian payment app with an intelligent safety layer: risk scoring, scam detection, trusted-person approval and a structured recovery workflow.',
  manifest: '/manifest.webmanifest',
  applicationName: 'TrustPay',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'TrustPay' },
  icons: {
    icon: [{ url: '/icons/favicon-64.png', sizes: '64x64', type: 'image/png' },
           { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#12212F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <StoreProvider>
          <AppLock>
            <AppFrame>{children}</AppFrame>
          </AppLock>
        </StoreProvider>
      </body>
    </html>
  );
}
