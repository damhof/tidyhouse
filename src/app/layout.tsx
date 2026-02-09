import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import { BottomNav, SideRail } from '@/components/Navigation';
import { Header } from '@/components/Header';
import { UserGate } from '@/components/UserGate';
import { ServiceWorker } from '@/components/ServiceWorker';
import { ToastContainer } from '@/components/Toast';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { getCurrentUserId, isAuthenticated, isAuthEnabled } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'TidyHouse',
  description: 'Household management for your household',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#7C9A82',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Check household auth first (password-based)
  const authed = await isAuthenticated();
  if (isAuthEnabled() && !authed) {
    // Middleware handles redirect, but for direct server renders:
    return (
      <html lang="en" suppressHydrationWarning>
        <body className="bg-warm-50 dark:bg-warm-950 text-warm-900 dark:text-warm-100 antialiased">
          {children}
        </body>
      </html>
    );
  }

  const userId = await getCurrentUserId();
  let user = null;
  if (userId) {
    user = db.select().from(users).where(eq(users.id, userId)).get() || null;
  }
  const allUsers = db.select().from(users).all();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
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
                <Header userName={user.name} userEmoji={user.avatarEmoji} userId={user.id} allUsers={allUsers} />
                <main className="px-4 py-6 max-w-6xl mx-auto animate-page-in">
                  {children}
                </main>
              </div>
              <BottomNav />
              <ToastContainer />
              <KeyboardShortcuts />
            </>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
