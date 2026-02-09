import webpush from 'web-push';

let vapidConfigured = false;

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function ensureVapid(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

  if (!publicKey || !privateKey) {
    // Auto-generate keys and log instructions
    const keys = webpush.generateVAPIDKeys();
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  Push Notifications: VAPID keys not configured!');
    console.log('  Add these to your .env file:');
    console.log(`  VAPID_PUBLIC_KEY=${keys.publicKey}`);
    console.log(`  VAPID_PRIVATE_KEY=${keys.privateKey}`);
    console.log(`  VAPID_EMAIL=mailto:your@email.com`);
    console.log('══════════════════════════════════════════════════════════\n');
    return false;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export { webpush };
