import type { Metadata } from 'next';
import './globals.css';
import { Toaster as OldToaster } from '@/components/ui/toaster';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'MutationFlow',
  description: 'Track mutation event streams with CQRS and Event Sourcing',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <Toaster position="bottom-center" />
        {children}
        <OldToaster />
      </body>
    </html>
  );
}
