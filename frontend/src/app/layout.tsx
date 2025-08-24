import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DrSync - Healthcare Appointment Management',
  description: 'Comprehensive healthcare appointment management solution with WhatsApp automation',
  keywords: ['healthcare', 'appointments', 'whatsapp', 'medical', 'practice management'],
  authors: [{ name: 'DrSync Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
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
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  );
}
