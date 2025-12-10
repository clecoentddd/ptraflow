import type { Metadata } from 'next';
import './globals.css';
import { Toaster as OldToaster } from '@/components/ui/toaster';
import { Toaster } from 'react-hot-toast';
import { AppNavigation } from '@/components/app-navigation';
import { MutationStepsNav } from '@/app/mutations/mutation-lifecycle/components/todo-list-view';
import { CqrsProvider } from '@/app/mutations/mutation-lifecycle/cqrs';

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
      <body className="font-body antialiased min-h-screen flex flex-col">
        <CqrsProvider>
          <Toaster position="bottom-center" />
          <AppNavigation />
          <MutationStepsNav />
          <main className="flex-1">
            {children}
          </main>
          <OldToaster />
        </CqrsProvider>
      </body>
    </html>
  );
}
