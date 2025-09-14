import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import PWAProvider from '../components/pwa/PWAProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DrSync - Healthcare Appointment Management',
  description: 'Comprehensive healthcare appointment management solution with WhatsApp automation and offline capabilities',
  keywords: ['healthcare', 'appointments', 'whatsapp', 'medical', 'practice management', 'PWA', 'offline'],
  authors: [{ name: 'DrSync Team' }],
  robots: 'index, follow',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DrSync'
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-152x152.png'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
  themeColor: '#2563eb'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body 
        className={`${inter.className} antialiased min-h-screen bg-gray-50`}
        suppressHydrationWarning
      >
        <PWAProvider>
          <div id="root">
            {children}
          </div>
        </PWAProvider>
      </body>
    </html>
  );
}
