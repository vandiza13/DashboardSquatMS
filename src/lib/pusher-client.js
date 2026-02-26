import PusherClient from 'pusher-js';

// Gunakan fallback 'ap1' (atau nilai dummy) jika env tidak terbaca saat build
// Ini mencegah error "Options object must provide a cluster"
const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || 'APP_KEY';
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1';

// Lazy initialization untuk mencegah error saat SSR/build
let _pusherClient = null;

export function getPusherClient() {
  if (typeof window === 'undefined') return null;
  if (!_pusherClient) {
    _pusherClient = new PusherClient(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: '/api/pusher/auth',
    });
  }
  return _pusherClient;
}

// Backward compatibility - tapi hanya gunakan di client-side code
export const pusherClient = typeof window !== 'undefined'
  ? new PusherClient(pusherKey, {
    cluster: pusherCluster,
    authEndpoint: '/api/pusher/auth',
  })
  : null;