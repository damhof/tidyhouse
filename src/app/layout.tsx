import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import { BottomNav, SideRail } from '@/components/Navigation';
import { Header } from '@/components/Header';
import { UserGate } from '@/components/UserGate';
import { ServiceWorker } from '@/components/ServiceWorker';
import { getCurrentUserId } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'TidyHouse',
  description: 'Household management for your household',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#4A8C4A',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId();
  let user = null;
  if (userId) {
    user = db.select().from(users).where(eq(users.id, userId)).get() || null;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-warm-50 dark:bg-warm-950 text-warm-900 dark:text-warm-100 antialiased">
        <ThemeProvider>
          <ServiceWorker />
          {!user ? (
            <UserGate />
          ) : (
            <>
              <SideRail />
              <div className="md:ml-20 lg:ml-56 min-h-screen pb-20 md:pb-0">
                <Header userName={user.name} userEmoji={user.avatarEmoji} userId={user.id} />
                <main className="px-4 py-6 max-w-4xl mx-auto">
                  {children}
                </main>
              </div>
              <BottomNav />
            </>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
